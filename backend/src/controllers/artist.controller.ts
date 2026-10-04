import { Request, Response } from 'express';
import { pool, getIsPostgresConnected, inMemoryStore } from '../config/database';

export class ArtistController {
  public static async getArtists(req: Request, res: Response): Promise<void> {
    try {
      if (getIsPostgresConnected()) {
        const query = 'SELECT * FROM artists ORDER BY name ASC LIMIT 30';
        const result = await pool.query(query);
        res.status(200).json({ success: true, data: result.rows });
      } else {
        const artists = Array.from(inMemoryStore.artists.values()).slice(0, 30);
        res.status(200).json({ success: true, data: artists });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Gagal memuat artis' });
    }
  }

  public static async getArtistById(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;

      if (getIsPostgresConnected()) {
        const aRes = await pool.query('SELECT * FROM artists WHERE id = $1', [id]);
        if (aRes.rows.length === 0) {
          res.status(404).json({ success: false, message: 'Artis tidak ditemukan' });
          return;
        }

        const songsRes = await pool.query(
          `SELECT s.*, alb.title as album_title 
           FROM songs s 
           LEFT JOIN albums alb ON s.album_id = alb.id 
           WHERE s.artist_id = $1 ORDER BY s.play_count DESC LIMIT 10`,
          [id]
        );

        const albumsRes = await pool.query('SELECT * FROM albums WHERE artist_id = $1 ORDER BY release_year DESC', [id]);

        res.status(200).json({
          success: true,
          data: {
            artist: aRes.rows[0],
            top_songs: songsRes.rows,
            albums: albumsRes.rows,
          },
        });
      } else {
        const artist = inMemoryStore.artists.get(id);
        if (!artist) {
          res.status(404).json({ success: false, message: 'Artis tidak ditemukan' });
          return;
        }

        const top_songs = Array.from(inMemoryStore.songs.values())
          .filter(s => s.artist_id === id)
          .sort((a, b) => (b.play_count || 0) - (a.play_count || 0))
          .slice(0, 10);

        const albums = Array.from(inMemoryStore.albums.values()).filter(a => a.artist_id === id);

        res.status(200).json({
          success: true,
          data: { artist, top_songs, albums },
        });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Gagal memuat detail artis' });
    }
  }

  public static async getAlbums(req: Request, res: Response): Promise<void> {
    try {
      if (getIsPostgresConnected()) {
        const query = `
          SELECT alb.*, a.name as artist_name 
          FROM albums alb
          JOIN artists a ON alb.artist_id = a.id
          ORDER BY alb.created_at DESC LIMIT 30
        `;
        const result = await pool.query(query);
        res.status(200).json({ success: true, data: result.rows });
      } else {
        const albums = Array.from(inMemoryStore.albums.values()).slice(0, 30).map(alb => {
          const a = inMemoryStore.artists.get(alb.artist_id);
          return { ...alb, artist_name: a?.name || 'Artis' };
        });
        res.status(200).json({ success: true, data: albums });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Gagal memuat album' });
    }
  }

  public static async getAlbumById(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;

      if (getIsPostgresConnected()) {
        const albRes = await pool.query(
          `SELECT alb.*, a.name as artist_name 
           FROM albums alb 
           JOIN artists a ON alb.artist_id = a.id 
           WHERE alb.id = $1`,
          [id]
        );
        if (albRes.rows.length === 0) {
          res.status(404).json({ success: false, message: 'Album tidak ditemukan' });
          return;
        }

        const songsRes = await pool.query(
          'SELECT * FROM songs WHERE album_id = $1 ORDER BY created_at ASC',
          [id]
        );

        res.status(200).json({
          success: true,
          data: {
            album: albRes.rows[0],
            songs: songsRes.rows,
          },
        });
      } else {
        const album = inMemoryStore.albums.get(id);
        if (!album) {
          res.status(404).json({ success: false, message: 'Album tidak ditemukan' });
          return;
        }

        const artist = inMemoryStore.artists.get(album.artist_id);
        const songs = Array.from(inMemoryStore.songs.values()).filter(s => s.album_id === id);

        res.status(200).json({
          success: true,
          data: {
            album: { ...album, artist_name: artist?.name || 'Artis' },
            songs,
          },
        });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Gagal memuat detail album' });
    }
  }
}
