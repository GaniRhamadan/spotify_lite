import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { pool, getIsPostgresConnected, inMemoryStore } from '../config/database';
import { AudioService } from '../services/audio.service';
import { YoutubeService } from '../services/youtube.service';
import { ENV } from '../config/env';

export class StreamController {
  public static async streamSong(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;

      // 1. Dukungan lagu live YouTube Music
      if (id.startsWith('yt_')) {
        try {
          const filePath = await YoutubeService.ensureAudioFile(id);
          AudioService.streamAudioFile(req, res, filePath, 'audio/mp4');
          return;
        } catch (e: any) {
          console.error('Gagal stream audio YouTube:', e);
          if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Gagal mengunduh audio YouTube: ' + e.message });
          }
          return;
        }
      }

      let song: any = null;

      if (getIsPostgresConnected()) {
        const query = 'SELECT id, file_path, mime_type FROM songs WHERE id = $1';
        const result = await pool.query(query, [id]);
        if (result.rows.length === 0) {
          res.status(404).json({ success: false, message: 'Lagu tidak ditemukan' });
          return;
        }
        song = result.rows[0];

        // Tingkatkan play_count secara asinkron tanpa memblokir stream
        pool.query('UPDATE songs SET play_count = play_count + 1 WHERE id = $1', [id]).catch(() => {});
      } else {
        song = inMemoryStore.songs.get(id);
        if (!song) {
          res.status(404).json({ success: false, message: 'Lagu tidak ditemukan' });
          return;
        }
        song.play_count = (song.play_count || 0) + 1;
      }

      // Selesaikan path file audio
      let fullPath = song.file_path;
      if (!path.isAbsolute(fullPath)) {
        fullPath = path.resolve(ENV.STORAGE_PATH, 'audio', song.file_path);
      }

      // Jika file audio fisik belum ada di disk (misal saat inisialisasi awal), buat placeholder suara tenang
      if (!fs.existsSync(fullPath)) {
        // Fallback jika file fisik tidak ada
        res.status(404).json({
          success: false,
          message: 'Berkas audio belum siap atau sedang diproses oleh server',
        });
        return;
      }

      // Alirkan audio dengan HTTP 206 Partial Content
      AudioService.streamAudioFile(req, res, fullPath, song.mime_type || 'audio/mpeg');
    } catch (error: any) {
      console.error('Kesalahan streaming audio:', error);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Gagal mengalirkan audio: ' + error.message });
      }
    }
  }
}
