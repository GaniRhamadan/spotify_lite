"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const uuid_1 = require("uuid");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const database_1 = require("../config/database");
const audio_service_1 = require("../services/audio.service");
const env_1 = require("../config/env");
class AdminController {
    static async uploadSong(req, res) {
        try {
            const files = req.files;
            const audioFile = files?.audio?.[0];
            const coverFile = files?.cover?.[0];
            if (!audioFile) {
                res.status(400).json({ success: false, message: 'Berkas audio (.mp3/.m4a) wajib diunggah' });
                return;
            }
            const { title, artist_id, album_id, lyrics } = req.body;
            if (!title || !artist_id) {
                res.status(400).json({ success: false, message: 'Judul dan artist_id wajib disertakan' });
                return;
            }
            // Ekstraksi tag ID3 & format audio
            const audioFullPath = audioFile.path;
            const metadata = await audio_service_1.AudioService.getAudioMetadata(audioFullPath);
            const songId = (0, uuid_1.v4)();
            const relativeAudioPath = path_1.default.basename(audioFile.path);
            const coverUrl = coverFile ? `/covers/${path_1.default.basename(coverFile.path)}` : null;
            if ((0, database_1.getIsPostgresConnected)()) {
                const query = `
          INSERT INTO songs (
            id, title, artist_id, album_id, duration_seconds,
            file_path, file_size, mime_type, bitrate, cover_url, lyrics
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING *
        `;
                const result = await database_1.pool.query(query, [
                    songId,
                    title.trim(),
                    artist_id,
                    album_id || null,
                    metadata.duration,
                    relativeAudioPath,
                    audioFile.size,
                    metadata.mimeType,
                    metadata.bitrate,
                    coverUrl,
                    lyrics || null,
                ]);
                res.status(201).json({
                    success: true,
                    message: 'Lagu berhasil diunggah dan siap dialirkan',
                    data: result.rows[0],
                });
            }
            else {
                const newSong = {
                    id: songId,
                    title: title.trim(),
                    artist_id,
                    album_id: album_id || null,
                    duration_seconds: metadata.duration,
                    file_path: relativeAudioPath,
                    file_size: audioFile.size,
                    mime_type: metadata.mimeType,
                    bitrate: metadata.bitrate,
                    cover_url: coverUrl,
                    lyrics: lyrics || null,
                    play_count: 0,
                    is_public: true,
                    created_at: new Date(),
                };
                database_1.inMemoryStore.songs.set(songId, newSong);
                res.status(201).json({
                    success: true,
                    message: 'Lagu berhasil diunggah (Mode Cepat)',
                    data: newSong,
                });
            }
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Gagal mengunggah lagu: ' + error.message });
        }
    }
    static async createArtist(req, res) {
        try {
            const { name, bio, image_url } = req.body;
            if (!name) {
                res.status(400).json({ success: false, message: 'Nama artis wajib diisi' });
                return;
            }
            const artistId = (0, uuid_1.v4)();
            if ((0, database_1.getIsPostgresConnected)()) {
                const result = await database_1.pool.query('INSERT INTO artists (id, name, bio, image_url) VALUES ($1, $2, $3, $4) RETURNING *', [artistId, name.trim(), bio || null, image_url || null]);
                res.status(201).json({ success: true, message: 'Artis berhasil ditambahkan', data: result.rows[0] });
            }
            else {
                const artist = {
                    id: artistId,
                    name: name.trim(),
                    bio: bio || null,
                    image_url: image_url || null,
                    created_at: new Date(),
                };
                database_1.inMemoryStore.artists.set(artistId, artist);
                res.status(201).json({ success: true, message: 'Artis berhasil ditambahkan', data: artist });
            }
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Gagal membuat artis: ' + error.message });
        }
    }
    static async createAlbum(req, res) {
        try {
            const { artist_id, title, cover_url, release_year } = req.body;
            if (!artist_id || !title) {
                res.status(400).json({ success: false, message: 'artist_id dan judul album wajib diisi' });
                return;
            }
            const albumId = (0, uuid_1.v4)();
            if ((0, database_1.getIsPostgresConnected)()) {
                const result = await database_1.pool.query('INSERT INTO albums (id, artist_id, title, cover_url, release_year) VALUES ($1, $2, $3, $4, $5) RETURNING *', [albumId, artist_id, title.trim(), cover_url || null, release_year || new Date().getFullYear()]);
                res.status(201).json({ success: true, message: 'Album berhasil dibuat', data: result.rows[0] });
            }
            else {
                const album = {
                    id: albumId,
                    artist_id,
                    title: title.trim(),
                    cover_url: cover_url || null,
                    release_year: release_year || new Date().getFullYear(),
                    created_at: new Date(),
                };
                database_1.inMemoryStore.albums.set(albumId, album);
                res.status(201).json({ success: true, message: 'Album berhasil dibuat', data: album });
            }
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Gagal membuat album: ' + error.message });
        }
    }
    static async deleteSong(req, res) {
        try {
            const id = req.params.id;
            if ((0, database_1.getIsPostgresConnected)()) {
                const sRes = await database_1.pool.query('SELECT file_path FROM songs WHERE id = $1', [id]);
                if (sRes.rows.length === 0) {
                    res.status(404).json({ success: false, message: 'Lagu tidak ditemukan' });
                    return;
                }
                const filePath = path_1.default.resolve(env_1.ENV.STORAGE_PATH, 'audio', sRes.rows[0].file_path);
                if (fs_1.default.existsSync(filePath)) {
                    try {
                        fs_1.default.unlinkSync(filePath);
                    }
                    catch { }
                }
                await database_1.pool.query('DELETE FROM songs WHERE id = $1', [id]);
            }
            else {
                const s = database_1.inMemoryStore.songs.get(id);
                if (!s) {
                    res.status(404).json({ success: false, message: 'Lagu tidak ditemukan' });
                    return;
                }
                database_1.inMemoryStore.songs.delete(id);
            }
            res.status(200).json({ success: true, message: 'Lagu berhasil dihapus' });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Gagal menghapus lagu' });
        }
    }
    static async getStats(req, res) {
        try {
            if ((0, database_1.getIsPostgresConnected)()) {
                const [users, songs, artists, plays] = await Promise.all([
                    database_1.pool.query('SELECT COUNT(*) FROM users'),
                    database_1.pool.query('SELECT COUNT(*) FROM songs'),
                    database_1.pool.query('SELECT COUNT(*) FROM artists'),
                    database_1.pool.query('SELECT COALESCE(SUM(play_count), 0) as total_plays FROM songs'),
                ]);
                res.status(200).json({
                    success: true,
                    data: {
                        totalUsers: parseInt(users.rows[0].count, 10),
                        totalSongs: parseInt(songs.rows[0].count, 10),
                        totalArtists: parseInt(artists.rows[0].count, 10),
                        totalPlays: parseInt(plays.rows[0].total_plays, 10),
                    },
                });
            }
            else {
                const totalPlays = Array.from(database_1.inMemoryStore.songs.values()).reduce((acc, curr) => acc + (curr.play_count || 0), 0);
                res.status(200).json({
                    success: true,
                    data: {
                        totalUsers: database_1.inMemoryStore.users.size,
                        totalSongs: database_1.inMemoryStore.songs.size,
                        totalArtists: database_1.inMemoryStore.artists.size,
                        totalPlays,
                    },
                });
            }
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Gagal memuat statistik' });
        }
    }
}
exports.AdminController = AdminController;
