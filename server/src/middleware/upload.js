const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Ensure upload directory exists
const uploadDir = process.env.AUDIO_UPLOAD_DIR || './uploads/audio';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `${uniqueId}${ext}`);
  },
});

// File filter for audio files
const audioFileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'audio/webm',
    'audio/mp3',
    'audio/mpeg',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/ogg',
    'audio/flac',
    'audio/m4a',
    'audio/mp4',
    'audio/x-m4a',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Only audio files are allowed.`), false);
  }
};

// Configure multer for audio uploads
const uploadAudio = multer({
  storage,
  fileFilter: audioFileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_AUDIO_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
  },
});

// Memory storage for files that need to be processed immediately
const memoryStorage = multer.memoryStorage();

const uploadAudioToMemory = multer({
  storage: memoryStorage,
  fileFilter: audioFileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_AUDIO_FILE_SIZE) || 10 * 1024 * 1024,
  },
});

// Helper to delete uploaded file
const deleteUploadedFile = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

module.exports = {
  uploadAudio,
  uploadAudioToMemory,
  deleteUploadedFile,
};

