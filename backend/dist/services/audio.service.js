"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudioService = void 0;
const fs_1 = __importDefault(require("fs"));
const mm = __importStar(require("music-metadata"));
class AudioService {
    /**
     * Ekstraksi metadata file audio (durasi detik, bitrate, mime type)
     */
    static async getAudioMetadata(filePath) {
        try {
            const metadata = await mm.parseFile(filePath);
            const duration = Math.round(metadata.format.duration || 0);
            const bitrate = metadata.format.bitrate || 192000;
            const mimeType = metadata.format.container ? `audio/${metadata.format.container.toLowerCase()}` : 'audio/mpeg';
            return { duration, bitrate, mimeType };
        }
        catch (error) {
            console.warn('Gagal membaca tag ID3 audio, menggunakan nilai bawaan:', error);
            return { duration: 180, bitrate: 192000, mimeType: 'audio/mpeg' };
        }
    }
    /**
     * Mengalirkan audio menggunakan protokol HTTP 206 Partial Content (Byte-Range)
     * Kunci dari pemutaran instan (< 1 detik) dan anti-lag
     */
    static streamAudioFile(req, res, filePath, mimeType = 'audio/mpeg') {
        if (!fs_1.default.existsSync(filePath)) {
            res.status(404).json({ success: false, message: 'Berkas audio tidak ditemukan di server' });
            return;
        }
        const stat = fs_1.default.statSync(filePath);
        const fileSize = stat.size;
        const range = req.headers.range;
        // Set header cache-control jangka panjang untuk file audio statis
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        if (!range) {
            // Jika client tidak meminta spesifik byte range, kirim seluruh file
            res.writeHead(200, {
                'Content-Length': fileSize,
                'Content-Type': mimeType,
            });
            fs_1.default.createReadStream(filePath).pipe(res);
            return;
        }
        // Mengurai Header Range: "bytes=0-1048576" atau "bytes=524288-"
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        // Batasi ukuran chunk maksimal 1MB per request agar hemat RAM dan bandwidth
        const CHUNK_SIZE = 1 * 1024 * 1024; // 1 MB chunk
        let end = parts[1] ? parseInt(parts[1], 10) : start + CHUNK_SIZE;
        // Pastikan end tidak melampaui batas akhir berkas
        if (end >= fileSize) {
            end = fileSize - 1;
        }
        // Jika rentang byte tidak valid
        if (start >= fileSize || start > end) {
            res.status(416).setHeader('Content-Range', `bytes */${fileSize}`);
            res.end();
            return;
        }
        const contentLength = end - start + 1;
        // Kirim respons HTTP 206 Partial Content
        res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': contentLength,
            'Content-Type': mimeType,
        });
        const fileStream = fs_1.default.createReadStream(filePath, { start, end });
        // Hubungkan stream ke response client secara non-blocking
        fileStream.pipe(res);
        // Tangani jika koneksi diputus oleh client (misal pengguna skip lagu)
        req.on('close', () => {
            fileStream.destroy();
        });
    }
}
exports.AudioService = AudioService;
