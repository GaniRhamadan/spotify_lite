"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArtistController = void 0;
const database_1 = require("../config/database");
class ArtistController {
    static async getArtists(req, res) {
        try {
            if ((0, database_1.getIsPostgresConnected)()) {
                const query = 'SELECT * FROM artists ORDER BY name ASC LIMIT 30';
                const result = await database_1.pool.query(query);
                res.status(200).json({ success: true, data: result.rows });
            }
            else {
                const artists = Array.from(database_1.inMemoryStore.artists.values()).slice(0, 30);
                res.status(200).json({ success: true, data: artists });
            }
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Gagal memuat artis' });
        }
    }
    static async getArtistById(req, res) {
        try {
            const id = req.params.id;
            if ((0, database_1.getIsPostgresConnected)()) {
                const aRes = await database_1.pool.query('SELECT * FROM artists WHERE id = $1', [id]);
                if (aRes.rows.length === 0) {
                    res.status(404).json({ success: false, message: 'Artis tidak ditemukan' });
                    return;
                }
                const songsRes = await database_1.pool.query(`SELECT s.*, alb.title as album_title 
           FROM songs s 
           LEFT JOIN albums alb ON s.album_id = alb.id 
           WHERE s.artist_id = $1 ORDER BY s.play_count DESC LIMIT 10`, [id]);
                const albumsRes = await database_1.pool.query('SELECT * FROM albums WHERE artist_id = $1 ORDER BY release_year DESC', [id]);
                res.status(200).json({
                    success: true,
                    data: {
                        artist: aRes.rows[0],
                        top_songs: songsRes.rows,
                        albums: albumsRes.rows,
                    },
                });
            }
            else {
                const artist = database_1.inMemoryStore.artists.get(id);
                if (!artist) {
                    res.status(404).json({ success: false, message: 'Artis tidak ditemukan' });
                    return;
                }
                const top_songs = Array.from(database_1.inMemoryStore.songs.values())
                    .filter(s => s.artist_id === id)
                    .sort((a, b) => (b.play_count || 0) - (a.play_count || 0))
                    .slice(0, 10);
                const albums = Array.from(database_1.inMemoryStore.albums.values()).filter(a => a.artist_id === id);
                res.status(200).json({
                    success: true,
                    data: { artist, top_songs, albums },
                });
            }
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Gagal memuat detail artis' });
        }
    }
    static async getAlbums(req, res) {
        try {
            if ((0, database_1.getIsPostgresConnected)()) {
                const query = `
          SELECT alb.*, a.name as artist_name 
          FROM albums alb
          JOIN artists a ON alb.artist_id = a.id
          ORDER BY alb.created_at DESC LIMIT 30
        `;
                const result = await database_1.pool.query(query);
                res.status(200).json({ success: true, data: result.rows });
            }
            else {
                const albums = Array.from(database_1.inMemoryStore.albums.values()).slice(0, 30).map(alb => {
                    const a = database_1.inMemoryStore.artists.get(alb.artist_id);
                    return { ...alb, artist_name: a?.name || 'Artis' };
                });
                res.status(200).json({ success: true, data: albums });
            }
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Gagal memuat album' });
        }
    }
    static async getAlbumById(req, res) {
        try {
            const id = req.params.id;
            if ((0, database_1.getIsPostgresConnected)()) {
                const albRes = await database_1.pool.query(`SELECT alb.*, a.name as artist_name 
           FROM albums alb 
           JOIN artists a ON alb.artist_id = a.id 
           WHERE alb.id = $1`, [id]);
                if (albRes.rows.length === 0) {
                    res.status(404).json({ success: false, message: 'Album tidak ditemukan' });
                    return;
                }
                const songsRes = await database_1.pool.query('SELECT * FROM songs WHERE album_id = $1 ORDER BY created_at ASC', [id]);
                res.status(200).json({
                    success: true,
                    data: {
                        album: albRes.rows[0],
                        songs: songsRes.rows,
                    },
                });
            }
            else {
                const album = database_1.inMemoryStore.albums.get(id);
                if (!album) {
                    res.status(404).json({ success: false, message: 'Album tidak ditemukan' });
                    return;
                }
                const artist = database_1.inMemoryStore.artists.get(album.artist_id);
                const songs = Array.from(database_1.inMemoryStore.songs.values()).filter(s => s.album_id === id);
                res.status(200).json({
                    success: true,
                    data: {
                        album: { ...album, artist_name: artist?.name || 'Artis' },
                        songs,
                    },
                });
            }
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Gagal memuat detail album' });
        }
    }
}
exports.ArtistController = ArtistController;
