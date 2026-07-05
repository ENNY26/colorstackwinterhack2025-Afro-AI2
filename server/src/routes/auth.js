const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { isDbConnected, ensureConnected } = require('../config/database');
const { auth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { TRIBES, NATIONALITIES } = require('../config/constants');
const { normalizePhoneE164, maskPhone } = require('../utils/phone');
const { createPendingToken, verifyPendingToken } = require('../utils/authTokens');
const twilioVerify = require('../services/twilioVerifyService');

const router = express.Router();

const checkDatabase = async (req, res, next) => {
  if (!isDbConnected()) {
    await ensureConnected();
  }
  if (!isDbConnected()) {
    return res.status(503).json({
      success: false,
      message:
        'Database not connected. If using MongoDB Atlas, add your IP to Network Access and restart the server.',
      error: 'DATABASE_NOT_CONNECTED',
    });
  }
  next();
};

function validationErrorResponse(res, errors) {
  return res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors: errors.array(),
  });
}

function issueAuthResponse(res, user, message) {
  const token = user.generateAuthToken();
  return res.json({
    success: true,
    message,
    data: {
      user,
      token,
    },
  });
}

const registerValidators = [
  checkDatabase,
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('tribe').isIn(TRIBES).withMessage('Please select a valid tribe'),
  body('nationality').trim().notEmpty().withMessage('Nationality is required'),
  body('age').isInt({ min: 13, max: 120 }).withMessage('Age must be between 13 and 120'),
];

const registerHandler = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return validationErrorResponse(res, errors);
  }

  const {
    email,
    password,
    name,
    phone,
    tribe,
    nationality,
    age,
    selectedLanguage,
    aiPersonality,
  } = req.body;

  let phoneE164;
  try {
    phoneE164 = normalizePhoneE164(phone);
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }

  const existingEmail = await User.findOne({ email });
  if (existingEmail) {
    return res.status(409).json({
      success: false,
      message: 'Email already registered',
    });
  }

  const existingPhone = await User.findOne({ phone: phoneE164 });
  if (existingPhone) {
    return res.status(409).json({
      success: false,
      message: 'Phone number already registered',
    });
  }

  const user = new User({
    email,
    password,
    name,
    phone: phoneE164,
    tribe,
    nationality,
    age,
    selectedLanguage: selectedLanguage || tribe || 'yoruba',
    aiPersonality: aiPersonality || 'friendly',
    phoneVerified: false,
    isVerified: false,
  });

  await user.save();

  await twilioVerify.sendVerificationCode(phoneE164);

  const pendingToken = createPendingToken(user._id.toString(), 'signup_verify');

  res.status(201).json({
    success: true,
    message: 'Account created. Enter the verification code sent to your phone.',
    data: {
      requiresPhoneVerification: true,
      pendingToken,
      phone: maskPhone(phoneE164),
      user,
    },
  });
});

router.post('/register', registerValidators, registerHandler);
router.post('/signup', registerValidators, registerHandler);
router.post('/sign-up', registerValidators, registerHandler);

/** Guest try-without-account (no phone verification). */
router.post('/guest', checkDatabase, asyncHandler(async (req, res) => {
  const guestEmail = `guest_${Date.now()}@afrolingo.app`;
  const guestPassword = `guest_${Math.random().toString(36).slice(2, 14)}`;

  const user = new User({
    email: guestEmail,
    password: guestPassword,
    name: 'Guest User',
    tribe: 'yoruba',
    selectedLanguage: 'yoruba',
    phoneVerified: false,
    isVerified: false,
  });

  await user.save();
  return issueAuthResponse(res, user, 'Guest session started');
}));

/**
 * @route   POST /api/auth/verify/phone/resend
 * @desc    Resend SMS code (signup or login pending token)
 */
router.post('/verify/phone/resend', [
  checkDatabase,
  body('pendingToken').notEmpty().withMessage('pendingToken is required'),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return validationErrorResponse(res, errors);
  }

  const { pendingToken } = req.body;
  let decoded;
  try {
    decoded = decodePendingToken(pendingToken);
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired session' });
  }

  const user = await User.findById(decoded.sub);
  if (!user || !user.phone) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  await twilioVerify.sendVerificationCode(user.phone);

  res.json({
    success: true,
    message: 'Verification code sent',
    data: { phone: maskPhone(user.phone) },
  });
}));

function decodePendingToken(pendingToken) {
  const jwt = require('jsonwebtoken');
  const decoded = jwt.verify(pendingToken, process.env.JWT_SECRET);
  if (!['signup_verify', 'login_verify'].includes(decoded.purpose)) {
    throw new Error('Invalid purpose');
  }
  return decoded;
}

/**
 * @route   POST /api/auth/verify/phone/confirm
 * @desc    Confirm SMS code after signup
 */
router.post('/verify/phone/confirm', [
  checkDatabase,
  body('pendingToken').notEmpty(),
  body('code').trim().notEmpty().withMessage('Verification code is required'),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return validationErrorResponse(res, errors);
  }

  const { pendingToken, code } = req.body;

  let decoded;
  try {
    decoded = verifyPendingToken(pendingToken, 'signup_verify');
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired verification session' });
  }

  const user = await User.findById(decoded.sub);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const result = await twilioVerify.checkVerificationCode(user.phone, code);
  if (!result.approved) {
    return res.status(400).json({
      success: false,
      message: 'Invalid verification code',
    });
  }

  user.phoneVerified = true;
  user.isVerified = true;
  await user.save();

  return issueAuthResponse(res, user, 'Phone verified successfully');
}));

/**
 * @route   POST /api/auth/login
 * @desc    Step 1: validate credentials and send login SMS code
 */
router.post('/login', [
  checkDatabase,
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return validationErrorResponse(res, errors);
  }

  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials',
    });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials',
    });
  }

  if (!user.isActive) {
    return res.status(403).json({
      success: false,
      message: 'Account is deactivated',
    });
  }

  // Guest / legacy accounts without phone — allow direct login
  if (!user.phone) {
    user.lastLoginAt = new Date();
    await user.save();
    return issueAuthResponse(res, user, 'Login successful');
  }

  if (!user.phoneVerified) {
    await twilioVerify.sendVerificationCode(user.phone);
    const pendingToken = createPendingToken(user._id.toString(), 'signup_verify', '30m');
    return res.status(403).json({
      success: false,
      code: 'PHONE_NOT_VERIFIED',
      message: 'Please verify your phone number first',
      data: {
        requiresPhoneVerification: true,
        pendingToken,
        phone: maskPhone(user.phone),
      },
    });
  }

  await twilioVerify.sendVerificationCode(user.phone);
  const pendingToken = createPendingToken(user._id.toString(), 'login_verify');

  res.json({
    success: true,
    message: 'Enter the security code sent to your phone',
    data: {
      requiresLoginOtp: true,
      pendingToken,
      phone: maskPhone(user.phone),
    },
  });
}));

/**
 * @route   POST /api/auth/login/confirm
 * @desc    Step 2: confirm login SMS code and receive JWT
 */
router.post('/login/confirm', [
  checkDatabase,
  body('pendingToken').notEmpty(),
  body('code').trim().notEmpty(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return validationErrorResponse(res, errors);
  }

  const { pendingToken, code } = req.body;

  let decoded;
  try {
    decoded = verifyPendingToken(pendingToken, 'login_verify');
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired login session' });
  }

  const user = await User.findById(decoded.sub);
  if (!user || !user.phone) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const result = await twilioVerify.checkVerificationCode(user.phone, code);
  if (!result.approved) {
    return res.status(400).json({
      success: false,
      message: 'Invalid security code',
    });
  }

  user.lastLoginAt = new Date();
  await user.save();

  return issueAuthResponse(res, user, 'Login successful');
}));

router.get('/config/signup-options', (req, res) => {
  res.json({
    success: true,
    data: {
      tribes: TRIBES,
      nationalities: NATIONALITIES,
      twilioConfigured: twilioVerify.isTwilioConfigured(),
    },
  });
});

router.get('/me', auth, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user,
    },
  });
}));

router.post('/logout', auth, (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

router.post('/refresh', auth, asyncHandler(async (req, res) => {
  const token = req.user.generateAuthToken();

  res.json({
    success: true,
    data: {
      token,
    },
  });
}));

module.exports = router;
