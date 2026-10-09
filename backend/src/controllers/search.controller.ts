import { Request, Response } from 'express';
import { pool, getIsPostgresConnected, inMemoryStore } from '../config/database';
import { YoutubeService } from '../services/youtube.service';

export class SearchController {
  public static async search(req: Request, res: Response): Promise<void> {
    try {
      const rawQ = (req.query.q as string) || '';
      const cleanQ = rawQ.trim().replace(/\s+/g, ' ');

      if (!cleanQ) {
        res.status(200).json({
          success: true,
          data: { songs: [], artists: [], albums: [], playlists: [] },
        });
        return;
      }

      const pattern = `%${cleanQ}%`;
      const queryLower = cleanQ.toLowerCase();

      // 1. Ambil data lokal dari PostgreSQL atau InMemoryStore
      let localSongs: any[] = [];
      let localArtists: any[] = [];
      let localAlbums: any[] = [];
      let localPlaylists: any[] = [];

      if (getIsPostgresConnected()) {
        const songsQuery = `
          SELECT s.id, s.title, s.duration_seconds, s.cover_url, s.play_count,
                 a.id as artist_id, a.name as artist_name, alb.id as album_id, alb.title as album_title,
                 CASE 
                   WHEN LOWER(s.title) = LOWER($2) THEN 1
                   WHEN LOWER(s.title) LIKE LOWER($2 || '%') THEN 2
                   WHEN LOWER(a.name) = LOWER($2) THEN 3
                   WHEN LOWER(a.name) LIKE LOWER($2 || '%') THEN 4
                   WHEN LOWER(s.title) LIKE LOWER('%' || $2 || '%') THEN 5
                   ELSE 6
                 END as match_priority
          FROM songs s
          LEFT JOIN artists a ON s.artist_id = a.id
          LEFT JOIN albums alb ON s.album_id = alb.id
          WHERE s.is_public = true AND (s.title ILIKE $1 OR a.name ILIKE $1 OR alb.title ILIKE $1)
          ORDER BY match_priority ASC, s.play_count DESC
          LIMIT 15
        `;
        const artistsQuery = 'SELECT id, name, image_url FROM artists WHERE name ILIKE $1 LIMIT 5';
        const albumsQuery = 'SELECT id, title, cover_url, release_year FROM albums WHERE title ILIKE $1 LIMIT 5';
        const playlistsQuery = 'SELECT id, title, cover_url, description FROM playlists WHERE is_public = true AND title ILIKE $1 LIMIT 5';

        const [songsRes, artistsRes, albumsRes, playlistsRes] = await Promise.all([
          pool.query(songsQuery, [pattern, cleanQ]),
          pool.query(artistsQuery, [pattern]),
          pool.query(albumsQuery, [pattern]),
          pool.query(playlistsQuery, [pattern]),
        ]);

        localSongs = songsRes.rows;
        localArtists = artistsRes.rows;
        localAlbums = albumsRes.rows;
        localPlaylists = playlistsRes.rows;
      } else {
        localSongs = Array.from(inMemoryStore.songs.values())
          .filter(s => {
            const artist = inMemoryStore.artists.get(s.artist_id);
            const album = s.album_id ? inMemoryStore.albums.get(s.album_id) : null;
            return (
              s.title.toLowerCase().includes(queryLower) ||
              (artist && artist.name.toLowerCase().includes(queryLower)) ||
              (album && album.title.toLowerCase().includes(queryLower))
            );
          })
          .map(s => {
            const artist = inMemoryStore.artists.get(s.artist_id);
            const album = s.album_id ? inMemoryStore.albums.get(s.album_id) : null;
            const tLower = s.title.toLowerCase();
            const aLower = (artist?.name || '').toLowerCase();
            let priority = 6;
            if (tLower === queryLower) priority = 1;
            else if (tLower.startsWith(queryLower)) priority = 2;
            else if (aLower === queryLower) priority = 3;
            else if (aLower.startsWith(queryLower)) priority = 4;
            else if (tLower.includes(queryLower)) priority = 5;

            return {
              ...s,
              artist_name: artist?.name || 'Artis',
              album_title: album?.title || 'Single',
              _priority: priority,
            };
          })
          .sort((a, b) => a._priority - b._priority || (b.play_count || 0) - (a.play_count || 0))
          .slice(0, 15);

        localArtists = Array.from(inMemoryStore.artists.values())
          .filter(a => a.name.toLowerCase().includes(queryLower))
          .slice(0, 5);

        localAlbums = Array.from(inMemoryStore.albums.values())
          .filter(alb => alb.title.toLowerCase().includes(queryLower))
          .slice(0, 5);

        localPlaylists = Array.from(inMemoryStore.playlists.values())
          .filter(p => p.is_public && p.title.toLowerCase().includes(queryLower))
          .slice(0, 5);
      }

      // 2. Cari juga secara online di YouTube Music dengan timeout proteksi (1.5 detik) agar respons tetap instan
      let ytSongs: any[] = [];
      try {
        const timeoutPromise = new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 1500));
        ytSongs = await Promise.race([
          YoutubeService.searchSongs(cleanQ, 10),
          timeoutPromise,
        ]);
      } catch (err) {
        console.warn('Gagal mencari di YouTube:', err);
      }

      // Gabungkan hasil: lagu lokal selalu prioritas terdepan + lagu YouTube Music pelengkap
      const seenIds = new Set<string>();
      const combinedSongs: any[] = [];

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
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Gagal melakukan pencarian: ' + error.message });
    }
  }
}
