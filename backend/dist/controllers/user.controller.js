"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const uuid_1 = require("uuid");
const database_1 = require("../config/database");
class UserController {
    static async toggleLikeSong(req, res) {
        try {
            const { songId } = req.params;
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({ success: false, message: 'Harus login terlebih dahulu' });
                return;
            }
            if ((0, database_1.getIsPostgresConnected)()) {
                const checkLike = await database_1.pool.query('SELECT id FROM liked_songs WHERE user_id = $1 AND song_id = $2', [userId, songId]);
                if (checkLike.rows.length > 0) {
                    // Unlike
                    await database_1.pool.query('DELETE FROM liked_songs WHERE user_id = $1 AND song_id = $2', [userId, songId]);
                    res.status(200).json({ success: true, message: 'Lagu dihapus dari Lagu yang Disukai', is_liked: false });
                }
                else {
                    // Like
                    await database_1.pool.query('INSERT INTO liked_songs (user_id, song_id) VALUES ($1, $2)', [userId, songId]);
                    res.status(200).json({ success: true, message: 'Lagu ditambahkan ke Lagu yang Disukai', is_liked: true });
                }
            }
            else {
                const key = `${userId}:${songId}`;
                if (database_1.inMemoryStore.liked_songs.has(key)) {
                    database_1.inMemoryStore.liked_songs.delete(key);
                    res.status(200).json({ success: true, message: 'Lagu dihapus dari Lagu yang Disukai', is_liked: false });
                }
                else {
                    database_1.inMemoryStore.liked_songs.add(key);
                    res.status(200).json({ success: true, message: 'Lagu ditambahkan ke Lagu yang Disukai', is_liked: true });
                }
            }
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Gagal memperbarui status suka: ' + error.message });
        }
    }
    static async getLikedSongs(req, res) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({ success: false, message: 'Harus login' });
                return;
            }
            if ((0, database_1.getIsPostgresConnected)()) {
                const query = `
          SELECT s.id, s.title, s.duration_seconds, s.cover_url, s.play_count,
                 a.name as artist_name, alb.title as album_title,
                 ls.created_at as liked_at,
                 true as is_liked
          FROM liked_songs ls
          JOIN songs s ON ls.song_id = s.id
          LEFT JOIN artists a ON s.artist_id = a.id
          LEFT JOIN albums alb ON s.album_id = alb.id
          WHERE ls.user_id = $1
          ORDER BY ls.created_at DESC
        `;
                const result = await database_1.pool.query(query, [userId]);
                res.status(200).json({ success: true, data: result.rows });
            }
            else {
                const likedSongIds = Array.from(database_1.inMemoryStore.liked_songs)
                    .filter(k => k.startsWith(`${userId}:`))
                    .map(k => k.split(':')[1]);
                const songs = likedSongIds
                    .map(id => database_1.inMemoryStore.songs.get(id))
                    .filter(Boolean)
                    .map(s => {
                    const artist = database_1.inMemoryStore.artists.get(s.artist_id);
                    const album = s.album_id ? database_1.inMemoryStore.albums.get(s.album_id) : null;
                    return {
                        ...s,
                        artist_name: artist?.name || 'Artis',
                        album_title: album?.title || null,
                        is_liked: true,
                    };
                });
                res.status(200).json({ success: true, data: songs });
            }
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Gagal memuat lagu yang disukai' });
        }
    }
    static async recordHistory(req, res) {
        try {
            const userId = req.user?.userId;
            const { songId, completedPercentage = 100 } = req.body;
            if (!userId || !songId) {
                res.status(400).json({ success: false, message: 'Data tidak lengkap' });
                return;
            }
            if ((0, database_1.getIsPostgresConnected)()) {
                await database_1.pool.query('INSERT INTO play_history (user_id, song_id, completed_percentage) VALUES ($1, $2, $3)', [userId, songId, completedPercentage]);
            }
            else {
                database_1.inMemoryStore.play_history.unshift({
                    id: (0, uuid_1.v4)(),
                    user_id: userId,
                    song_id: songId,
                    played_at: new Date(),
                });
            }
            res.status(200).json({ success: true, message: 'Riwayat pemutaran tercatat' });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Gagal mencatat riwayat' });
        }
    }
    static async getHistory(req, res) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({ success: false, message: 'Harus login' });
                return;
            }
            if ((0, database_1.getIsPostgresConnected)()) {
                const query = `
          SELECT DISTINCT ON (s.id) 
            s.id, s.title, s.duration_seconds, s.cover_url,
            a.name as artist_name, h.played_at
          FROM play_history h
          JOIN songs s ON h.song_id = s.id
          LEFT JOIN artists a ON s.artist_id = a.id
          WHERE h.user_id = $1
          ORDER BY s.id, h.played_at DESC
          LIMIT 20
        `;
                const result = await database_1.pool.query(query, [userId]);
                res.status(200).json({ success: true, data: result.rows });
            }
            else {
                const userHist = database_1.inMemoryStore.play_history.filter(h => h.user_id === userId).slice(0, 20);
                const songs = userHist.map(h => {
                    const s = database_1.inMemoryStore.songs.get(h.song_id);
                    const a = database_1.inMemoryStore.artists.get(s?.artist_id);
                    return {
                        ...s,
                        artist_name: a?.name || 'Artis',
                        played_at: h.played_at,
                    };
                }).filter(s => s && s.id);
                res.status(200).json({ success: true, data: songs });
            }
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Gagal memuat riwayat' });
        }
    }
    static async getSettings(req, res) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({ success: false, message: 'Harus login' });
                return;
            }
            if ((0, database_1.getIsPostgresConnected)()) {
                const result = await database_1.pool.query('SELECT * FROM user_settings WHERE user_id = $1', [userId]);
                if (result.rows.length === 0) {
                    await database_1.pool.query('INSERT INTO user_settings (user_id) VALUES ($1)', [userId]);
                    res.status(200).json({
                        success: true,
                        data: { audio_quality: 'medium', theme: 'dark', offline_mode: false, last_played_position_seconds: 0, last_queue_ids: [] },
                    });
                }
                else {
                    res.status(200).json({ success: true, data: result.rows[0] });
                }
            }
            else {
                const settings = database_1.inMemoryStore.user_settings.get(userId) || {
                    audio_quality: 'medium',
                    theme: 'dark',
                    offline_mode: false,
                    last_played_position_seconds: 0,
                    last_queue_ids: [],
                };
                res.status(200).json({ success: true, data: settings });
            }
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Gagal memuat pengaturan' });
        }
    }
    static async updateSettings(req, res) {
        try {
            const userId = req.user?.userId;
            const { audio_quality, theme, offline_mode } = req.body;
            if (!userId) {
                res.status(401).json({ success: false, message: 'Harus login' });
                return;
            }
            if ((0, database_1.getIsPostgresConnected)()) {
                await database_1.pool.query(`UPDATE user_settings 
           SET audio_quality = COALESCE($1, audio_quality),
               theme = COALESCE($2, theme),
               offline_mode = COALESCE($3, offline_mode),
               updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $4`, [audio_quality, theme, offline_mode, userId]);
            }
            else {
                const s = database_1.inMemoryStore.user_settings.get(userId) || {};
                database_1.inMemoryStore.user_settings.set(userId, {
                    ...s,
                    audio_quality: audio_quality || s.audio_quality || 'medium',
                    theme: theme || s.theme || 'dark',
                    offline_mode: offline_mode !== undefined ? offline_mode : s.offline_mode,
                });
            }
            res.status(200).json({ success: true, message: 'Pengaturan berhasil disimpan' });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Gagal memperbarui pengaturan' });
        }
    }
    static async syncState(req, res) {
        try {
            const userId = req.user?.userId;
            const { last_played_song_id, last_played_position_seconds, last_queue_ids } = req.body;
            if (!userId) {
                res.status(401).json({ success: false, message: 'Harus login' });
                return;
            }
            if ((0, database_1.getIsPostgresConnected)()) {
                await database_1.pool.query(`UPDATE user_settings 
           SET last_played_song_id = $1,
               last_played_position_seconds = $2,
               last_queue_ids = $3::jsonb,
               updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $4`, [last_played_song_id || null, last_played_position_seconds || 0, JSON.stringify(last_queue_ids || []), userId]);
            }
            else {
                const s = database_1.inMemoryStore.user_settings.get(userId) || {};
                database_1.inMemoryStore.user_settings.set(userId, {
                    ...s,
                    last_played_song_id,
                    last_played_position_seconds,
                    last_queue_ids: last_queue_ids || [],
                });
            }
            res.status(200).json({ success: true, message: 'Status pemutar berhasil disinkronisasi' });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Gagal sinkronisasi status pemutar' });
        }
    }
}
exports.UserController = UserController;
