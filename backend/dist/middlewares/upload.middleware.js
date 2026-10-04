"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadMedia = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const env_1 = require("../config/env");
// Pastikan folder penyimpanan tersedia
const audioDir = path_1.default.join(env_1.ENV.STORAGE_PATH, 'audio');
const coverDir = path_1.default.join(env_1.ENV.STORAGE_PATH, 'covers');
if (!fs_1.default.existsSync(audioDir))
    fs_1.default.mkdirSync(audioDir, { recursive: true });
if (!fs_1.default.existsSync(coverDir))
    fs_1.default.mkdirSync(coverDir, { recursive: true });
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === 'audio') {
            cb(null, audioDir);
        }
        else {
            cb(null, coverDir);
        }
    },
    filename: (req, file, cb) => {
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        const uniqueName = `${(0, uuid_1.v4)()}${ext}`;
        cb(null, uniqueName);
    },
});
exports.uploadMedia = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: env_1.ENV.MAX_AUDIO_SIZE_MB * 1024 * 1024, // Maksimal 30 MB
    },
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'audio') {
            const allowedAudio = ['.mp3', '.m4a', '.aac', '.wav', '.ogg'];
            const ext = path_1.default.extname(file.originalname).toLowerCase();
            if (allowedAudio.includes(ext)) {
                cb(null, true);
            }
            else {
                cb(new Error('Format berkas audio harus MP3, M4A, AAC, WAV, atau OGG'));
            }
        }
        else if (file.fieldname === 'cover') {
            const allowedImages = ['.jpg', '.jpeg', '.png', '.webp'];
            const ext = path_1.default.extname(file.originalname).toLowerCase();
            if (allowedImages.includes(ext)) {
                cb(null, true);
            }
            else {
                cb(new Error('Format gambar sampul harus JPG, PNG, atau WebP'));
            }
        }
        else {
            cb(null, true);
        }
    },
});
