"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchController = void 0;
const database_1 = require("../config/database");
const youtube_service_1 = require("../services/youtube.service");
class SearchController {
    static async search(req, res) {
        try {
            const q = (req.query.q || '').trim();
            if (!q) {
                res.status(200).json({
                    success: true,
                    data: { songs: [], artists: [], albums: [], playlists: [] },
                });
                return;
            }
            const pattern = `%${q}%`;
            const queryLower = q.toLowerCase();
            // 1. Ambil data lokal
            let localSongs = [];
            let localArtists = [];
            let localAlbums = [];
            let localPlaylists = [];
            if ((0, database_1.getIsPostgresConnected)()) {
                const songsQuery = `
          SELECT s.id, s.title, s.duration_seconds, s.cover_url, s.play_count,
                 a.name as artist_name, alb.title as album_title
          FROM songs s
          LEFT JOIN artists a ON s.artist_id = a.id
          LEFT JOIN albums alb ON s.album_id = alb.id
          WHERE s.is_public = true AND (s.title ILIKE $1 OR a.name ILIKE $1)
          LIMIT 10
        `;
                const artistsQuery = 'SELECT id, name, image_url FROM artists WHERE name ILIKE $1 LIMIT 5';
                const albumsQuery = 'SELECT id, title, cover_url, release_year FROM albums WHERE title ILIKE $1 LIMIT 5';
                const playlistsQuery = 'SELECT id, title, cover_url, description FROM playlists WHERE is_public = true AND title ILIKE $1 LIMIT 5';
                const [songsRes, artistsRes, albumsRes, playlistsRes] = await Promise.all([
                    database_1.pool.query(songsQuery, [pattern]),
                    database_1.pool.query(artistsQuery, [pattern]),
                    database_1.pool.query(albumsQuery, [pattern]),
                    database_1.pool.query(playlistsQuery, [pattern]),
                ]);
                localSongs = songsRes.rows;
                localArtists = artistsRes.rows;
                localAlbums = albumsRes.rows;
                localPlaylists = playlistsRes.rows;
            }
            else {
                localSongs = Array.from(database_1.inMemoryStore.songs.values())
                    .filter(s => {
                    const artist = database_1.inMemoryStore.artists.get(s.artist_id);
                    return (s.title.toLowerCase().includes(queryLower) ||
                        (artist && artist.name.toLowerCase().includes(queryLower)));
                })
                    .slice(0, 10)
                    .map(s => {
                    const artist = database_1.inMemoryStore.artists.get(s.artist_id);
                    return { ...s, artist_name: artist?.name || 'Artis' };
                });
                localArtists = Array.from(database_1.inMemoryStore.artists.values())
                    .filter(a => a.name.toLowerCase().includes(queryLower))
                    .slice(0, 5);
                localAlbums = Array.from(database_1.inMemoryStore.albums.values())
                    .filter(alb => alb.title.toLowerCase().includes(queryLower))
                    .slice(0, 5);
                localPlaylists = Array.from(database_1.inMemoryStore.playlists.values())
                    .filter(p => p.is_public && p.title.toLowerCase().includes(queryLower))
                    .slice(0, 5);
            }
            // 2. Cari juga secara online di YouTube Music untuk lagu-lagu populer apa pun
            let ytSongs = [];
            try {
                ytSongs = await youtube_service_1.YoutubeService.searchSongs(q, 10);
            }
            catch (err) {
                console.warn('Gagal mencari di YouTube:', err);
            }
            // Gabungkan hasil: lagu lokal + lagu online YouTube Music (hindari ID duplikat)
            const seenIds = new Set();
            const combinedSongs = [];
            for (const s of [...localSongs, ...ytSongs]) {
                if (!seenIds.has(s.id)) {
                    seenIds.add(s.id);
                    combinedSongs.push(s);
                }
            }
            res.status(200).json({
                success: true,
                data: {
                    songs: combinedSongs,
                    artists: localArtists,
                    albums: localAlbums,
                    playlists: localPlaylists,
                },
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Gagal melakukan pencarian: ' + error.message });
        }
    }
}
exports.SearchController = SearchController;
