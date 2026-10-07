"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SongController = void 0;
const database_1 = require("../config/database");
const cache_service_1 = require("../services/cache.service");
const youtube_service_1 = require("../services/youtube.service");
class SongController {
    static async getAllSongs(req, res) {
        try {
            const page = parseInt(req.query.page || '1', 10);
            const limit = parseInt(req.query.limit || '20', 10);
            const offset = (page - 1) * limit;
            const currentUserId = req.user?.userId;
            // Cek cache Redis untuk halaman 1 default (jika user tidak login)
            const cacheKey = `songs:page:${page}:limit:${limit}`;
            if (!currentUserId && page === 1) {
                const cached = await cache_service_1.cacheService.get(cacheKey);
                if (cached) {
                    res.status(200).json(JSON.parse(cached));
                    return;
                }
            }
            if ((0, database_1.getIsPostgresConnected)()) {
                const query = `
          SELECT 
            s.id, s.title, s.duration_seconds, s.file_size, s.mime_type, s.bitrate,
            s.cover_url, s.lyrics, s.play_count, s.created_at,
            a.id as artist_id, a.name as artist_name,
            alb.id as album_id, alb.title as album_title,
            CASE WHEN ls.song_id IS NOT NULL THEN true ELSE false END as is_liked
          FROM songs s
          LEFT JOIN artists a ON s.artist_id = a.id
          LEFT JOIN albums alb ON s.album_id = alb.id
          LEFT JOIN liked_songs ls ON s.id = ls.song_id AND ls.user_id = $1
          WHERE s.is_public = true
          ORDER BY s.created_at DESC
          LIMIT $2 OFFSET $3
        `;
                const result = await database_1.pool.query(query, [currentUserId || null, limit, offset]);
                const countQuery = 'SELECT COUNT(*) FROM songs WHERE is_public = true';
                const countRes = await database_1.pool.query(countQuery);
                const total = parseInt(countRes.rows[0].count, 10);
                const responsePayload = {
                    success: true,
                    data: result.rows,
                    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
                };
                if (!currentUserId && page === 1) {
                    await cache_service_1.cacheService.set(cacheKey, JSON.stringify(responsePayload), 120);
                }
                res.status(200).json(responsePayload);
            }
            else {
                // Fallback in-memory
                const songsArray = Array.from(database_1.inMemoryStore.songs.values());
                const total = songsArray.length;
                const paged = songsArray.slice(offset, offset + limit).map(s => {
                    const artist = database_1.inMemoryStore.artists.get(s.artist_id);
                    const album = s.album_id ? database_1.inMemoryStore.albums.get(s.album_id) : null;
                    const isLiked = currentUserId ? database_1.inMemoryStore.liked_songs.has(`${currentUserId}:${s.id}`) : false;
                    return {
                        ...s,
                        artist_name: artist?.name || 'Artis Tidak Diketahui',
                        album_title: album?.title || null,
                        is_liked: isLiked,
                    };
                });
                res.status(200).json({
                    success: true,
                    data: paged,
                    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
                });
            }
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Gagal mengambil lagu: ' + error.message });
        }
    }
    static async getSongById(req, res) {
        try {
            const id = req.params.id;
            const currentUserId = req.user?.userId;
            if ((0, database_1.getIsPostgresConnected)()) {
                const query = `
          SELECT 
            s.*,
            a.name as artist_name, a.image_url as artist_image,
            alb.title as album_title, alb.cover_url as album_cover,
            CASE WHEN ls.song_id IS NOT NULL THEN true ELSE false END as is_liked
          FROM songs s
          LEFT JOIN artists a ON s.artist_id = a.id
          LEFT JOIN albums alb ON s.album_id = alb.id
          LEFT JOIN liked_songs ls ON s.id = ls.song_id AND ls.user_id = $1
          WHERE s.id = $2
        `;
                const result = await database_1.pool.query(query, [currentUserId || null, id]);
                if (result.rows.length === 0) {
                    res.status(404).json({ success: false, message: 'Lagu tidak ditemukan' });
                    return;
                }
                res.status(200).json({ success: true, data: result.rows[0] });
            }
            else {
                let song = database_1.inMemoryStore.songs.get(id);
                if (!song && id.startsWith('yt_')) {
                    song = await youtube_service_1.YoutubeService.getSongMetadata(id);
                }
                if (!song) {
                    res.status(404).json({ success: false, message: 'Lagu tidak ditemukan' });
                    return;
                }
                const artist = database_1.inMemoryStore.artists.get(song.artist_id);
                const album = song.album_id ? database_1.inMemoryStore.albums.get(song.album_id) : null;
                const isLiked = currentUserId ? database_1.inMemoryStore.liked_songs.has(`${currentUserId}:${id}`) : false;
                res.status(200).json({
                    success: true,
                    data: {
                        ...song,
                        artist_name: artist?.name || 'Artis Tidak Diketahui',
                        album_title: album?.title || null,
                        is_liked: isLiked,
                    },
                });
            }
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Gagal memuat lagu: ' + error.message });
        }
    }
    static async getTrending(req, res) {
        try {
            if ((0, database_1.getIsPostgresConnected)()) {
                const query = `
          SELECT s.id, s.title, s.duration_seconds, s.cover_url, s.play_count,
                 a.name as artist_name
          FROM songs s
          LEFT JOIN artists a ON s.artist_id = a.id
          ORDER BY s.play_count DESC, s.created_at DESC
          LIMIT 10
        `;
                const result = await database_1.pool.query(query);
                res.status(200).json({ success: true, data: result.rows });
            }
            else {
                const sorted = Array.from(database_1.inMemoryStore.songs.values())
                    .sort((a, b) => (b.play_count || 0) - (a.play_count || 0))
                    .slice(0, 10)
                    .map(s => {
                    const artist = database_1.inMemoryStore.artists.get(s.artist_id);
                    return {
                        ...s,
                        artist_name: artist?.name || 'Artis Tidak Diketahui',
                    };
                });
                res.status(200).json({ success: true, data: sorted });
            }
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Gagal memuat lagu trending' });
        }
    }
}
exports.SongController = SongController;
