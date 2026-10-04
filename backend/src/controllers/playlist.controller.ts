import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool, getIsPostgresConnected, inMemoryStore } from '../config/database';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { IPlaylist } from '../types';

export class PlaylistController {
  public static async createPlaylist(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      const playlistId = uuidv4();

      if (getIsPostgresConnected()) {
        const query = `
          INSERT INTO playlists (id, user_id, title, description, is_public, cover_url)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `;
        const result = await pool.query(query, [playlistId, userId, title.trim(), description || null, is_public, cover_url || null]);
        res.status(201).json({ success: true, message: 'Playlist berhasil dibuat', data: result.rows[0] });
      } else {
        const newPlaylist: IPlaylist = {
          id: playlistId,
          user_id: userId,
          title: title.trim(),
          description: description || null,
          cover_url: cover_url || null,
          is_public,
          created_at: new Date(),
          song_count: 0,
        };
        inMemoryStore.playlists.set(playlistId, newPlaylist);
        res.status(201).json({ success: true, message: 'Playlist berhasil dibuat', data: newPlaylist });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Gagal membuat playlist: ' + error.message });
    }
  }

  public static async getPlaylists(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (getIsPostgresConnected()) {
        const query = `
          SELECT p.*, COUNT(ps.song_id)::int as song_count
          FROM playlists p
          LEFT JOIN playlist_songs ps ON p.id = ps.playlist_id
          WHERE p.is_public = true OR p.user_id = $1
          GROUP BY p.id
          ORDER BY p.created_at DESC
        `;
        const result = await pool.query(query, [userId || null]);
        res.status(200).json({ success: true, data: result.rows });
      } else {
        const list = Array.from(inMemoryStore.playlists.values())
          .filter(p => p.is_public || p.user_id === userId)
          .map(p => {
            const count = inMemoryStore.playlist_songs.filter(ps => ps.playlist_id === p.id).length;
            return { ...p, song_count: count };
          });
        res.status(200).json({ success: true, data: list });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Gagal memuat playlist' });
    }
  }

  public static async getPlaylistById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const userId = req.user?.userId;

      if (getIsPostgresConnected()) {
        const pQuery = 'SELECT * FROM playlists WHERE id = $1';
        const pResult = await pool.query(pQuery, [id]);
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
        const songsResult = await pool.query(songsQuery, [userId || null, id]);

        res.status(200).json({
          success: true,
          data: {
            ...playlist,
            songs: songsResult.rows,
          },
        });
      } else {
        const playlist = inMemoryStore.playlists.get(id);
        if (!playlist) {
          res.status(404).json({ success: false, message: 'Playlist tidak ditemukan' });
          return;
        }

        const relation = inMemoryStore.playlist_songs
          .filter(ps => ps.playlist_id === id)
          .sort((a, b) => a.order_index - b.order_index);

        const songs = relation.map(ps => {
          const s = inMemoryStore.songs.get(ps.song_id);
          const artist = inMemoryStore.artists.get(s?.artist_id);
          const isLiked = userId ? inMemoryStore.liked_songs.has(`${userId}:${s?.id}`) : false;
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
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Gagal memuat detail playlist' });
    }
  }

  public static async addSongToPlaylist(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const { songId } = req.body;
      const userId = req.user?.userId;

      if (!songId) {
        res.status(400).json({ success: false, message: 'songId wajib disertakan' });
        return;
      }

      if (getIsPostgresConnected()) {
        const checkOwner = await pool.query('SELECT user_id FROM playlists WHERE id = $1', [id]);
        if (checkOwner.rows.length === 0 || checkOwner.rows[0].user_id !== userId) {
          res.status(403).json({ success: false, message: 'Tidak memiliki izin mengubah playlist ini' });
          return;
        }

        const maxOrder = await pool.query('SELECT COALESCE(MAX(order_index), -1) as max_idx FROM playlist_songs WHERE playlist_id = $1', [id]);
        const nextOrder = maxOrder.rows[0].max_idx + 1;

        await pool.query(
          'INSERT INTO playlist_songs (playlist_id, song_id, order_index) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [id, songId, nextOrder]
        );

        res.status(200).json({ success: true, message: 'Lagu berhasil ditambahkan ke playlist' });
      } else {
        const playlist = inMemoryStore.playlists.get(id);
        if (!playlist || playlist.user_id !== userId) {
          res.status(403).json({ success: false, message: 'Tidak memiliki izin mengubah playlist ini' });
          return;
        }

        const exists = inMemoryStore.playlist_songs.some(ps => ps.playlist_id === id && ps.song_id === songId);
        if (!exists) {
          const currentCount = inMemoryStore.playlist_songs.filter(ps => ps.playlist_id === id).length;
          inMemoryStore.playlist_songs.push({
            id: uuidv4(),
            playlist_id: id,
            song_id: songId,
            order_index: currentCount,
          });
        }
        res.status(200).json({ success: true, message: 'Lagu berhasil ditambahkan ke playlist' });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Gagal menambah lagu ke playlist' });
    }
  }

  public static async removeSongFromPlaylist(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const songId = req.params.songId as string;
      const userId = req.user?.userId;

      if (getIsPostgresConnected()) {
        const checkOwner = await pool.query('SELECT user_id FROM playlists WHERE id = $1', [id]);
        if (checkOwner.rows.length === 0 || checkOwner.rows[0].user_id !== userId) {
          res.status(403).json({ success: false, message: 'Tidak memiliki izin mengubah playlist ini' });
          return;
        }

        await pool.query('DELETE FROM playlist_songs WHERE playlist_id = $1 AND song_id = $2', [id, songId]);
        res.status(200).json({ success: true, message: 'Lagu berhasil dihapus dari playlist' });
      } else {
        const playlist = inMemoryStore.playlists.get(id);
        if (!playlist || playlist.user_id !== userId) {
          res.status(403).json({ success: false, message: 'Tidak memiliki izin' });
          return;
        }

        inMemoryStore.playlist_songs = inMemoryStore.playlist_songs.filter(
          ps => !(ps.playlist_id === id && ps.song_id === songId)
        );
        res.status(200).json({ success: true, message: 'Lagu berhasil dihapus dari playlist' });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Gagal menghapus lagu dari playlist' });
    }
  }

  public static async reorderSongs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const { songIds } = req.body; // Array urutan baru song ID
      const userId = req.user?.userId;

      if (!Array.isArray(songIds)) {
        res.status(400).json({ success: false, message: 'songIds harus berupa array string ID lagu' });
        return;
      }

      if (getIsPostgresConnected()) {
        const checkOwner = await pool.query('SELECT user_id FROM playlists WHERE id = $1', [id]);
        if (checkOwner.rows.length === 0 || checkOwner.rows[0].user_id !== userId) {
          res.status(403).json({ success: false, message: 'Tidak memiliki izin' });
          return;
        }

        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          for (let i = 0; i < songIds.length; i++) {
            await client.query(
              'UPDATE playlist_songs SET order_index = $1 WHERE playlist_id = $2 AND song_id = $3',
              [i, id, songIds[i]]
            );
          }
          await client.query('COMMIT');
        } catch (e) {
          await client.query('ROLLBACK');
          throw e;
        } finally {
          client.release();
        }

        res.status(200).json({ success: true, message: 'Urutan lagu playlist berhasil diperbarui' });
      } else {
        for (let i = 0; i < songIds.length; i++) {
          const item = inMemoryStore.playlist_songs.find(ps => ps.playlist_id === id && ps.song_id === songIds[i]);
          if (item) item.order_index = i;
        }
        res.status(200).json({ success: true, message: 'Urutan lagu playlist berhasil diperbarui' });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Gagal memperbarui urutan lagu' });
    }
  }

  public static async deletePlaylist(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const userId = req.user?.userId;

      if (getIsPostgresConnected()) {
        const checkOwner = await pool.query('SELECT user_id FROM playlists WHERE id = $1', [id]);
        if (checkOwner.rows.length === 0 || checkOwner.rows[0].user_id !== userId) {
          res.status(403).json({ success: false, message: 'Tidak memiliki izin' });
          return;
        }

        await pool.query('DELETE FROM playlists WHERE id = $1', [id]);
        res.status(200).json({ success: true, message: 'Playlist berhasil dihapus' });
      } else {
        const p = inMemoryStore.playlists.get(id);
        if (!p || p.user_id !== userId) {
          res.status(403).json({ success: false, message: 'Tidak memiliki izin' });
          return;
        }
        inMemoryStore.playlists.delete(id);
        inMemoryStore.playlist_songs = inMemoryStore.playlist_songs.filter(ps => ps.playlist_id !== id);
        res.status(200).json({ success: true, message: 'Playlist berhasil dihapus' });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Gagal menghapus playlist' });
    }
  }
}
