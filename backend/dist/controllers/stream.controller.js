"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamController = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const database_1 = require("../config/database");
const audio_service_1 = require("../services/audio.service");
const youtube_service_1 = require("../services/youtube.service");
const env_1 = require("../config/env");
class StreamController {
    static async streamSong(req, res) {
        try {
            const id = req.params.id;
            // 1. Dukungan lagu live YouTube Music
            if (id.startsWith('yt_')) {
                try {
                    const filePath = await youtube_service_1.YoutubeService.ensureAudioFile(id);
                    audio_service_1.AudioService.streamAudioFile(req, res, filePath, 'audio/mp4');
                    return;
                }
                catch (e) {
                    console.error('Gagal stream audio YouTube:', e);
                    if (!res.headersSent) {
                        res.status(500).json({ success: false, message: 'Gagal mengunduh audio YouTube: ' + e.message });
                    }
                    return;
                }
            }
            let song = null;
            if ((0, database_1.getIsPostgresConnected)()) {
                const query = 'SELECT id, file_path, mime_type FROM songs WHERE id = $1';
                const result = await database_1.pool.query(query, [id]);
                if (result.rows.length === 0) {
                    res.status(404).json({ success: false, message: 'Lagu tidak ditemukan' });
                    return;
                }
                song = result.rows[0];
                // Tingkatkan play_count secara asinkron tanpa memblokir stream
                database_1.pool.query('UPDATE songs SET play_count = play_count + 1 WHERE id = $1', [id]).catch(() => { });
            }
            else {
                song = database_1.inMemoryStore.songs.get(id);
                if (!song) {
                    res.status(404).json({ success: false, message: 'Lagu tidak ditemukan' });
                    return;
                }
                song.play_count = (song.play_count || 0) + 1;
            }
            // Selesaikan path file audio
            let fullPath = song.file_path;
            if (!path_1.default.isAbsolute(fullPath)) {
                fullPath = path_1.default.resolve(env_1.ENV.STORAGE_PATH, 'audio', song.file_path);
            }
            // Jika file audio fisik belum ada di disk (misal saat inisialisasi awal), buat placeholder suara tenang
            if (!fs_1.default.existsSync(fullPath)) {
                // Fallback jika file fisik tidak ada
                res.status(404).json({
                    success: false,
                    message: 'Berkas audio belum siap atau sedang diproses oleh server',
                });
                return;
            }
            // Alirkan audio dengan HTTP 206 Partial Content
            audio_service_1.AudioService.streamAudioFile(req, res, fullPath, song.mime_type || 'audio/mpeg');
        }
        catch (error) {
            console.error('Kesalahan streaming audio:', error);
            if (!res.headersSent) {
                res.status(500).json({ success: false, message: 'Gagal mengalirkan audio: ' + error.message });
            }
        }
    }
}
exports.StreamController = StreamController;
