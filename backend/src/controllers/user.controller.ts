import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool, getIsPostgresConnected, inMemoryStore } from '../config/database';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export class UserController {
  public static async toggleLikeSong(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { songId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Harus login terlebih dahulu' });
        return;
      }

      if (getIsPostgresConnected()) {
        const checkLike = await pool.query('SELECT id FROM liked_songs WHERE user_id = $1 AND song_id = $2', [userId, songId]);
        if (checkLike.rows.length > 0) {
          // Unlike
          await pool.query('DELETE FROM liked_songs WHERE user_id = $1 AND song_id = $2', [userId, songId]);
          res.status(200).json({ success: true, message: 'Lagu dihapus dari Lagu yang Disukai', is_liked: false });
        } else {
          // Like
          await pool.query('INSERT INTO liked_songs (user_id, song_id) VALUES ($1, $2)', [userId, songId]);
          res.status(200).json({ success: true, message: 'Lagu ditambahkan ke Lagu yang Disukai', is_liked: true });
        }
      } else {
        const key = `${userId}:${songId}`;
        if (inMemoryStore.liked_songs.has(key)) {
          inMemoryStore.liked_songs.delete(key);
          res.status(200).json({ success: true, message: 'Lagu dihapus dari Lagu yang Disukai', is_liked: false });
        } else {
          inMemoryStore.liked_songs.add(key);
          res.status(200).json({ success: true, message: 'Lagu ditambahkan ke Lagu yang Disukai', is_liked: true });
        }
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Gagal memperbarui status suka: ' + error.message });
    }
  }

  public static async getLikedSongs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Harus login' });
        return;
      }

      if (getIsPostgresConnected()) {
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
        const result = await pool.query(query, [userId]);
        res.status(200).json({ success: true, data: result.rows });
      } else {
        const likedSongIds = Array.from(inMemoryStore.liked_songs)
          .filter(k => k.startsWith(`${userId}:`))
          .map(k => k.split(':')[1]);

        const songs = likedSongIds
          .map(id => inMemoryStore.songs.get(id))
          .filter(Boolean)
          .map(s => {
            const artist = inMemoryStore.artists.get(s.artist_id);
            const album = s.album_id ? inMemoryStore.albums.get(s.album_id) : null;
            return {
              ...s,
              artist_name: artist?.name || 'Artis',
              album_title: album?.title || null,
              is_liked: true,
            };
          });

        res.status(200).json({ success: true, data: songs });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Gagal memuat lagu yang disukai' });
    }
  }

  public static async recordHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { songId, completedPercentage = 100 } = req.body;

      if (!userId || !songId) {
        res.status(400).json({ success: false, message: 'Data tidak lengkap' });
        return;
      }

      if (getIsPostgresConnected()) {
        await pool.query(
          'INSERT INTO play_history (user_id, song_id, completed_percentage) VALUES ($1, $2, $3)',
          [userId, songId, completedPercentage]
        );
      } else {
        inMemoryStore.play_history.unshift({
          id: uuidv4(),
          user_id: userId,
          song_id: songId,
          played_at: new Date(),
        });
      }

      res.status(200).json({ success: true, message: 'Riwayat pemutaran tercatat' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Gagal mencatat riwayat' });
    }
  }

  public static async getHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Harus login' });
        return;
      }

      if (getIsPostgresConnected()) {
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
        const result = await pool.query(query, [userId]);
        res.status(200).json({ success: true, data: result.rows });
      } else {
        const userHist = inMemoryStore.play_history.filter(h => h.user_id === userId).slice(0, 20);
        const songs = userHist.map(h => {
          const s = inMemoryStore.songs.get(h.song_id);
          const a = inMemoryStore.artists.get(s?.artist_id);
          return {
            ...s,
            artist_name: a?.name || 'Artis',
            played_at: h.played_at,
          };
        }).filter(s => s && s.id);

        res.status(200).json({ success: true, data: songs });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Gagal memuat riwayat' });
    }
  }

  public static async getSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Harus login' });
        return;
      }

      if (getIsPostgresConnected()) {
        const result = await pool.query('SELECT * FROM user_settings WHERE user_id = $1', [userId]);
        if (result.rows.length === 0) {
          await pool.query('INSERT INTO user_settings (user_id) VALUES ($1)', [userId]);
          res.status(200).json({
            success: true,
            data: { audio_quality: 'medium', theme: 'dark', offline_mode: false, last_played_position_seconds: 0, last_queue_ids: [] },
          });
        } else {
          res.status(200).json({ success: true, data: result.rows[0] });
        }
      } else {
        const settings = inMemoryStore.user_settings.get(userId) || {
          audio_quality: 'medium',
          theme: 'dark',
          offline_mode: false,
          last_played_position_seconds: 0,
          last_queue_ids: [],
        };
        res.status(200).json({ success: true, data: settings });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Gagal memuat pengaturan' });
    }
  }

  public static async updateSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { audio_quality, theme, offline_mode } = req.body;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Harus login' });
        return;
      }

      if (getIsPostgresConnected()) {
        await pool.query(
          `UPDATE user_settings 
           SET audio_quality = COALESCE($1, audio_quality),
               theme = COALESCE($2, theme),
               offline_mode = COALESCE($3, offline_mode),
               updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $4`,
          [audio_quality, theme, offline_mode, userId]
        );
      } else {
        const s = inMemoryStore.user_settings.get(userId) || {};
        inMemoryStore.user_settings.set(userId, {
          ...s,
          audio_quality: audio_quality || s.audio_quality || 'medium',
          theme: theme || s.theme || 'dark',
          offline_mode: offline_mode !== undefined ? offline_mode : s.offline_mode,
        });
      }

      res.status(200).json({ success: true, message: 'Pengaturan berhasil disimpan' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Gagal memperbarui pengaturan' });
    }
  }

  public static async syncState(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { last_played_song_id, last_played_position_seconds, last_queue_ids } = req.body;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Harus login' });
        return;
      }

      if (getIsPostgresConnected()) {
        await pool.query(
          `UPDATE user_settings 
           SET last_played_song_id = $1,
               last_played_position_seconds = $2,
               last_queue_ids = $3::jsonb,
               updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $4`,
          [last_played_song_id || null, last_played_position_seconds || 0, JSON.stringify(last_queue_ids || []), userId]
        );
      } else {
        const s = inMemoryStore.user_settings.get(userId) || {};
        inMemoryStore.user_settings.set(userId, {
          ...s,
          last_played_song_id,
          last_played_position_seconds,
          last_queue_ids: last_queue_ids || [],
        });
      }

      res.status(200).json({ success: true, message: 'Status pemutar berhasil disinkronisasi' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Gagal sinkronisasi status pemutar' });
    }
  }
}
