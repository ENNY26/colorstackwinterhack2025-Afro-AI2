const jwt = require('jsonwebtoken');

function createPendingToken(userId, purpose, expiresIn = '15m') {
  return jwt.sign(
    { sub: userId, purpose },
    process.env.JWT_SECRET,
    { expiresIn }
  );
}

function verifyPendingToken(token, expectedPurpose) {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (decoded.purpose !== expectedPurpose) {
    throw new Error('Invalid token purpose');
  }
  return decoded;
}

module.exports = { createPendingToken, verifyPendingToken };
