"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlaylistController = void 0;
const uuid_1 = require("uuid");
const database_1 = require("../config/database");
class PlaylistController {
    static async createPlaylist(req, res) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({ success: false, message: 'Harus login untuk membuat playlist' });
                return;
            }
            const { title, description, is_public = true, cover_url } = req.body;
            if (!title) {
                res.status(400).json({ success: false, message: 'Judul playlist wajib diisi' });
                return;
            }
            const playlistId = (0, uuid_1.v4)();
            if ((0, database_1.getIsPostgresConnected)()) {
                const query = `
          INSERT INTO playlists (id, user_id, title, description, is_public, cover_url)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `;
                const result = await database_1.pool.query(query, [playlistId, userId, title.trim(), description || null, is_public, cover_url || null]);
                res.status(201).json({ success: true, message: 'Playlist berhasil dibuat', data: result.rows[0] });
            }
            else {
                const newPlaylist = {
                    id: playlistId,
                    user_id: userId,
                    title: title.trim(),
                    description: description || null,
                    cover_url: cover_url || null,
                    is_public,
                    created_at: new Date(),
                    song_count: 0,
                };
                database_1.inMemoryStore.playlists.set(playlistId, newPlaylist);
                res.status(201).json({ success: true, message: 'Playlist berhasil dibuat', data: newPlaylist });
            }
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Gagal membuat playlist: ' + error.message });
        }
    }
    static async getPlaylists(req, res) {
        try {
            const userId = req.user?.userId;
            if ((0, database_1.getIsPostgresConnected)()) {
                const query = `
          SELECT p.*, COUNT(ps.song_id)::int as song_count
          FROM playlists p
          LEFT JOIN playlist_songs ps ON p.id = ps.playlist_id
          WHERE p.is_public = true OR p.user_id = $1
          GROUP BY p.id
          ORDER BY p.created_at DESC
        `;
                const result = await database_1.pool.query(query, [userId || null]);
                res.status(200).json({ success: true, data: result.rows });
            }
            else {
                const list = Array.from(database_1.inMemoryStore.playlists.values())
                    .filter(p => p.is_public || p.user_id === userId)
                    .map(p => {
                    const count = database_1.inMemoryStore.playlist_songs.filter(ps => ps.playlist_id === p.id).length;
                    return { ...p, song_count: count };
                });
                res.status(200).json({ success: true, data: list });
            }
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Gagal memuat playlist' });
        }
    }
    static async getPlaylistById(req, res) {
        try {
            const id = req.params.id;
            const userId = req.user?.userId;
            if ((0, database_1.getIsPostgresConnected)()) {
                const pQuery = 'SELECT * FROM playlists WHERE id = $1';
                const pResult = await database_1.pool.query(pQuery, [id]);
                if (pResult.rows.length === 0) {
                    res.status(404).json({ success: false, message: 'Playlist tidak ditemukan' });
                    return;
                }
                const playlist = pResult.rows[0];
                const songsQuery = `
          SELECT 
            s.id, s.title, s.duration_seconds, s.cover_url, s.play_count,
            a.name as artist_name, alb.title as album_title,
            ps.order_index, ps.added_at,
            CASE WHEN ls.song_id IS NOT NULL THEN true ELSE false END as is_liked
          FROM playlist_songs ps
          JOIN songs s ON ps.song_id = s.id
          LEFT JOIN artists a ON s.artist_id = a.id
          LEFT JOIN albums alb ON s.album_id = alb.id
          LEFT JOIN liked_songs ls ON s.id = ls.song_id AND ls.user_id = $1
          WHERE ps.playlist_id = $2
          ORDER BY ps.order_index ASC
        `;
                const songsResult = await database_1.pool.query(songsQuery, [userId || null, id]);
                res.status(200).json({
                    success: true,
                    data: {
                        ...playlist,
                        songs: songsResult.rows,
                    },
                });
            }
            else {
                const playlist = database_1.inMemoryStore.playlists.get(id);
                if (!playlist) {
                    res.status(404).json({ success: false, message: 'Playlist tidak ditemukan' });
                    return;
                }
                const relation = database_1.inMemoryStore.playlist_songs
                    .filter(ps => ps.playlist_id === id)
                    .sort((a, b) => a.order_index - b.order_index);
                const songs = relation.map(ps => {
                    const s = database_1.inMemoryStore.songs.get(ps.song_id);
                    const artist = database_1.inMemoryStore.artists.get(s?.artist_id);
                    const isLiked = userId ? database_1.inMemoryStore.liked_songs.has(`${userId}:${s?.id}`) : false;
                    return {
                        ...s,
                        artist_name: artist?.name || 'Artis',
                        order_index: ps.order_index,
                        is_liked: isLiked,
                    };
                });
                res.status(200).json({
                    success: true,
                    data: {
                        ...playlist,
                        songs,
                    },
                });
            }
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Gagal memuat detail playlist' });
        }
    }
    static async addSongToPlaylist(req, res) {
        try {
            const id = req.params.id;
            const { songId } = req.body;
            const userId = req.user?.userId;
            if (!songId) {
                res.status(400).json({ success: false, message: 'songId wajib disertakan' });
                return;
            }
            if ((0, database_1.getIsPostgresConnected)()) {
                const checkOwner = await database_1.pool.query('SELECT user_id FROM playlists WHERE id = $1', [id]);
                if (checkOwner.rows.length === 0 || checkOwner.rows[0].user_id !== userId) {
                    res.status(403).json({ success: false, message: 'Tidak memiliki izin mengubah playlist ini' });
                    return;
                }
                const maxOrder = await database_1.pool.query('SELECT COALESCE(MAX(order_index), -1) as max_idx FROM playlist_songs WHERE playlist_id = $1', [id]);
                const nextOrder = maxOrder.rows[0].max_idx + 1;
                await database_1.pool.query('INSERT INTO playlist_songs (playlist_id, song_id, order_index) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [id, songId, nextOrder]);
                res.status(200).json({ success: true, message: 'Lagu berhasil ditambahkan ke playlist' });
            }
            else {
                const playlist = database_1.inMemoryStore.playlists.get(id);
                if (!playlist || playlist.user_id !== userId) {
                    res.status(403).json({ success: false, message: 'Tidak memiliki izin mengubah playlist ini' });
                    return;
                }
                const exists = database_1.inMemoryStore.playlist_songs.some(ps => ps.playlist_id === id && ps.song_id === songId);
                if (!exists) {
                    const currentCount = database_1.inMemoryStore.playlist_songs.filter(ps => ps.playlist_id === id).length;
                    database_1.inMemoryStore.playlist_songs.push({
                        id: (0, uuid_1.v4)(),
                        playlist_id: id,
                        song_id: songId,
                        order_index: currentCount,
                    });
                }
                res.status(200).json({ success: true, message: 'Lagu berhasil ditambahkan ke playlist' });
            }
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Gagal menambah lagu ke playlist' });
        }
    }
    static async removeSongFromPlaylist(req, res) {
        try {
            const id = req.params.id;
            const songId = req.params.songId;
            const userId = req.user?.userId;
            if ((0, database_1.getIsPostgresConnected)()) {
                const checkOwner = await database_1.pool.query('SELECT user_id FROM playlists WHERE id = $1', [id]);
                if (checkOwner.rows.length === 0 || checkOwner.rows[0].user_id !== userId) {
                    res.status(403).json({ success: false, message: 'Tidak memiliki izin mengubah playlist ini' });
                    return;
                }
                await database_1.pool.query('DELETE FROM playlist_songs WHERE playlist_id = $1 AND song_id = $2', [id, songId]);
                res.status(200).json({ success: true, message: 'Lagu berhasil dihapus dari playlist' });
            }
            else {
                const playlist = database_1.inMemoryStore.playlists.get(id);
                if (!playlist || playlist.user_id !== userId) {
                    res.status(403).json({ success: false, message: 'Tidak memiliki izin' });
                    return;
                }
                database_1.inMemoryStore.playlist_songs = database_1.inMemoryStore.playlist_songs.filter(ps => !(ps.playlist_id === id && ps.song_id === songId));
                res.status(200).json({ success: true, message: 'Lagu berhasil dihapus dari playlist' });
            }
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Gagal menghapus lagu dari playlist' });
        }
    }
    static async reorderSongs(req, res) {
        try {
            const id = req.params.id;
            const { songIds } = req.body; // Array urutan baru song ID
            const userId = req.user?.userId;
            if (!Array.isArray(songIds)) {
                res.status(400).json({ success: false, message: 'songIds harus berupa array string ID lagu' });
                return;
            }
            if ((0, database_1.getIsPostgresConnected)()) {
                const checkOwner = await database_1.pool.query('SELECT user_id FROM playlists WHERE id = $1', [id]);
                if (checkOwner.rows.length === 0 || checkOwner.rows[0].user_id !== userId) {
                    res.status(403).json({ success: false, message: 'Tidak memiliki izin' });
                    return;
                }
                const client = await database_1.pool.connect();
                try {
                    await client.query('BEGIN');
                    for (let i = 0; i < songIds.length; i++) {
                        await client.query('UPDATE playlist_songs SET order_index = $1 WHERE playlist_id = $2 AND song_id = $3', [i, id, songIds[i]]);
                    }
                    await client.query('COMMIT');
                }
                catch (e) {
                    await client.query('ROLLBACK');
                    throw e;
                }
                finally {
                    client.release();
                }
                res.status(200).json({ success: true, message: 'Urutan lagu playlist berhasil diperbarui' });
            }
            else {
                for (let i = 0; i < songIds.length; i++) {
                    const item = database_1.inMemoryStore.playlist_songs.find(ps => ps.playlist_id === id && ps.song_id === songIds[i]);
                    if (item)
                        item.order_index = i;
                }
                res.status(200).json({ success: true, message: 'Urutan lagu playlist berhasil diperbarui' });
            }
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Gagal memperbarui urutan lagu' });
        }
    }
    static async deletePlaylist(req, res) {
        try {
            const id = req.params.id;
            const userId = req.user?.userId;
            if ((0, database_1.getIsPostgresConnected)()) {
                const checkOwner = await database_1.pool.query('SELECT user_id FROM playlists WHERE id = $1', [id]);
                if (checkOwner.rows.length === 0 || checkOwner.rows[0].user_id !== userId) {
                    res.status(403).json({ success: false, message: 'Tidak memiliki izin' });
                    return;
                }
                await database_1.pool.query('DELETE FROM playlists WHERE id = $1', [id]);
                res.status(200).json({ success: true, message: 'Playlist berhasil dihapus' });
            }
            else {
                const p = database_1.inMemoryStore.playlists.get(id);
                if (!p || p.user_id !== userId) {
                    res.status(403).json({ success: false, message: 'Tidak memiliki izin' });
                    return;
                }
                database_1.inMemoryStore.playlists.delete(id);
                database_1.inMemoryStore.playlist_songs = database_1.inMemoryStore.playlist_songs.filter(ps => ps.playlist_id !== id);
                res.status(200).json({ success: true, message: 'Playlist berhasil dihapus' });
            }
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Gagal menghapus playlist' });
        }
    }
}
exports.PlaylistController = PlaylistController;
