import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { pool, getIsPostgresConnected, inMemoryStore } from '../config/database';
import { AudioService } from '../services/audio.service';
import { ENV } from '../config/env';
import { ISong, IArtist, IAlbum } from '../types';

export class AdminController {
  public static async uploadSong(req: Request, res: Response): Promise<void> {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const audioFile = files?.audio?.[0];
      const coverFile = files?.cover?.[0];

      if (!audioFile) {
        res.status(400).json({ success: false, message: 'Berkas audio (.mp3/.m4a) wajib diunggah' });
        return;
      }

      const { title, artist_id, album_id, lyrics } = req.body;
      if (!title || !artist_id) {
        res.status(400).json({ success: false, message: 'Judul dan artist_id wajib disertakan' });
        return;
      }

      // Ekstraksi tag ID3 & format audio
      const audioFullPath = audioFile.path;
      const metadata = await AudioService.getAudioMetadata(audioFullPath);

      const songId = uuidv4();
      const relativeAudioPath = path.basename(audioFile.path);
      const coverUrl = coverFile ? `/covers/${path.basename(coverFile.path)}` : null;

      if (getIsPostgresConnected()) {
        const query = `
          INSERT INTO songs (
            id, title, artist_id, album_id, duration_seconds,
            file_path, file_size, mime_type, bitrate, cover_url, lyrics
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING *
        `;
        const result = await pool.query(query, [
          songId,
          title.trim(),
          artist_id,
          album_id || null,
          metadata.duration,
          relativeAudioPath,
          audioFile.size,
          metadata.mimeType,
          metadata.bitrate,
          coverUrl,
          lyrics || null,
        ]);

        res.status(201).json({
          success: true,
          message: 'Lagu berhasil diunggah dan siap dialirkan',
          data: result.rows[0],
        });
      } else {
        const newSong: ISong = {
          id: songId,
          title: title.trim(),
          artist_id,
          album_id: album_id || null,
          duration_seconds: metadata.duration,
          file_path: relativeAudioPath,
          file_size: audioFile.size,
          mime_type: metadata.mimeType,
          bitrate: metadata.bitrate,
          cover_url: coverUrl,
          lyrics: lyrics || null,
          play_count: 0,
          is_public: true,
          created_at: new Date(),
        };
        inMemoryStore.songs.set(songId, newSong);

        res.status(201).json({
          success: true,
          message: 'Lagu berhasil diunggah (Mode Cepat)',
          data: newSong,
        });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Gagal mengunggah lagu: ' + error.message });
    }
  }

  public static async createArtist(req: Request, res: Response): Promise<void> {
    try {
      const { name, bio, image_url } = req.body;
      if (!name) {
        res.status(400).json({ success: false, message: 'Nama artis wajib diisi' });
        return;
      }

      const artistId = uuidv4();
      if (getIsPostgresConnected()) {
        const result = await pool.query(
          'INSERT INTO artists (id, name, bio, image_url) VALUES ($1, $2, $3, $4) RETURNING *',
          [artistId, name.trim(), bio || null, image_url || null]
        );
        res.status(201).json({ success: true, message: 'Artis berhasil ditambahkan', data: result.rows[0] });
      } else {
        const artist: IArtist = {
          id: artistId,
          name: name.trim(),
          bio: bio || null,
          image_url: image_url || null,
          created_at: new Date(),
        };
        inMemoryStore.artists.set(artistId, artist);
        res.status(201).json({ success: true, message: 'Artis berhasil ditambahkan', data: artist });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Gagal membuat artis: ' + error.message });
    }
  }

  public static async createAlbum(req: Request, res: Response): Promise<void> {
    try {
      const { artist_id, title, cover_url, release_year } = req.body;
      if (!artist_id || !title) {
        res.status(400).json({ success: false, message: 'artist_id dan judul album wajib diisi' });
        return;
      }

      const albumId = uuidv4();
      if (getIsPostgresConnected()) {
        const result = await pool.query(
          'INSERT INTO albums (id, artist_id, title, cover_url, release_year) VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [albumId, artist_id, title.trim(), cover_url || null, release_year || new Date().getFullYear()]
        );
        res.status(201).json({ success: true, message: 'Album berhasil dibuat', data: result.rows[0] });
      } else {
        const album: IAlbum = {
          id: albumId,
          artist_id,
          title: title.trim(),
          cover_url: cover_url || null,
          release_year: release_year || new Date().getFullYear(),
          created_at: new Date(),
        };
        inMemoryStore.albums.set(albumId, album);
        res.status(201).json({ success: true, message: 'Album berhasil dibuat', data: album });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Gagal membuat album: ' + error.message });
    }
  }

  public static async deleteSong(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;

      if (getIsPostgresConnected()) {
        const sRes = await pool.query('SELECT file_path FROM songs WHERE id = $1', [id]);
        if (sRes.rows.length === 0) {
          res.status(404).json({ success: false, message: 'Lagu tidak ditemukan' });
          return;
        }

        const filePath = path.resolve(ENV.STORAGE_PATH, 'audio', sRes.rows[0].file_path);
        if (fs.existsSync(filePath)) {
          try { fs.unlinkSync(filePath); } catch {}
        }

        await pool.query('DELETE FROM songs WHERE id = $1', [id]);
      } else {
        const s = inMemoryStore.songs.get(id);
        if (!s) {
          res.status(404).json({ success: false, message: 'Lagu tidak ditemukan' });
          return;
        }
        inMemoryStore.songs.delete(id);
      }

      res.status(200).json({ success: true, message: 'Lagu berhasil dihapus' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Gagal menghapus lagu' });
    }
  }

  public static async getStats(req: Request, res: Response): Promise<void> {
    try {
      if (getIsPostgresConnected()) {
        const [users, songs, artists, plays] = await Promise.all([
          pool.query('SELECT COUNT(*) FROM users'),
          pool.query('SELECT COUNT(*) FROM songs'),
          pool.query('SELECT COUNT(*) FROM artists'),
          pool.query('SELECT COALESCE(SUM(play_count), 0) as total_plays FROM songs'),
        ]);

        res.status(200).json({
          success: true,
          data: {
            totalUsers: parseInt(users.rows[0].count, 10),
            totalSongs: parseInt(songs.rows[0].count, 10),
            totalArtists: parseInt(artists.rows[0].count, 10),
            totalPlays: parseInt(plays.rows[0].total_plays, 10),
          },
        });
      } else {
        const totalPlays = Array.from(inMemoryStore.songs.values()).reduce((acc, curr) => acc + (curr.play_count || 0), 0);
        res.status(200).json({
          success: true,
          data: {
            totalUsers: inMemoryStore.users.size,
            totalSongs: inMemoryStore.songs.size,
            totalArtists: inMemoryStore.artists.size,
            totalPlays,
          },
        });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Gagal memuat statistik' });
    }
  }
}
