import { Request, Response } from 'express';
import { pool, getIsPostgresConnected, inMemoryStore } from '../config/database';
import { YoutubeService } from '../services/youtube.service';

export class SearchController {
  public static async search(req: Request, res: Response): Promise<void> {
    try {
      const q = ((req.query.q as string) || '').trim();

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
      let localSongs: any[] = [];
      let localArtists: any[] = [];
      let localAlbums: any[] = [];
      let localPlaylists: any[] = [];

      if (getIsPostgresConnected()) {
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
          pool.query(songsQuery, [pattern]),
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
            return (
              s.title.toLowerCase().includes(queryLower) ||
              (artist && artist.name.toLowerCase().includes(queryLower))
            );
          })
          .slice(0, 10)
          .map(s => {
            const artist = inMemoryStore.artists.get(s.artist_id);
            return { ...s, artist_name: artist?.name || 'Artis' };
          });

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

      // 2. Cari juga secara online di YouTube Music untuk lagu-lagu populer apa pun
      let ytSongs: any[] = [];
      try {
        ytSongs = await YoutubeService.searchSongs(q, 10);
      } catch (err) {
        console.warn('Gagal mencari di YouTube:', err);
      }

      // Gabungkan hasil: lagu lokal + lagu online YouTube Music (hindari ID duplikat)
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
