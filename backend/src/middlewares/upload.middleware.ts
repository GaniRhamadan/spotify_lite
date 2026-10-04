import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { ENV } from '../config/env';

// Pastikan folder penyimpanan tersedia
const audioDir = path.join(ENV.STORAGE_PATH, 'audio');
const coverDir = path.join(ENV.STORAGE_PATH, 'covers');

if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });
if (!fs.existsSync(coverDir)) fs.mkdirSync(coverDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'audio') {
      cb(null, audioDir);
    } else {
      cb(null, coverDir);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

export const uploadMedia = multer({
  storage,
  limits: {
    fileSize: ENV.MAX_AUDIO_SIZE_MB * 1024 * 1024, // Maksimal 30 MB
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'audio') {
      const allowedAudio = ['.mp3', '.m4a', '.aac', '.wav', '.ogg'];
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowedAudio.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error('Format berkas audio harus MP3, M4A, AAC, WAV, atau OGG'));
      }
    } else if (file.fieldname === 'cover') {
      const allowedImages = ['.jpg', '.jpeg', '.png', '.webp'];
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowedImages.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error('Format gambar sampul harus JPG, PNG, atau WebP'));
      }
    } else {
      cb(null, true);
    }
  },
});
