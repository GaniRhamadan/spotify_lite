import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { ENV } from '../config/env';
import { inMemoryStore } from '../config/database';

export interface YTSong {
  id: string;
  title: string;
  artist_id: string;
  artist_name: string;
  album_id: string | null;
  album_title: string | null;
  duration_seconds: number;
  cover_url: string;
  play_count: number;
  is_liked: boolean;
  lyrics?: string;
  file_path: string;
  mime_type: string;
  is_public: boolean;
}

const YTDLP_PATH = fs.existsSync('/usr/local/bin/yt-dlp')
  ? '/usr/local/bin/yt-dlp'
  : (fs.existsSync('/home/gani/.local/bin/yt-dlp') ? '/home/gani/.local/bin/yt-dlp' : 'yt-dlp');

// Antrean download aktif untuk menghindari download ganda file yang sama
const activeDownloads = new Map<string, Promise<string>>();

export class YoutubeService {
  /**
   * Cari lagu di YouTube Music / YouTube secara cepat menggunakan yt-dlp
   */
  public static async searchSongs(query: string, limit: number = 10): Promise<YTSong[]> {
    return new Promise((resolve) => {
      const searchParam = `ytsearch${limit}:${query}`;
      const args = [
        searchParam,
        '--dump-json',
        '--flat-playlist',
        '--default-search',
        'ytsearch',
        '--no-warnings',
      ];

      const child = spawn(YTDLP_PATH, args);
      let stdoutData = '';

      child.stdout.on('data', (chunk) => {
        stdoutData += chunk.toString();
      });

      child.on('close', (code) => {
        if (code !== 0 && !stdoutData.trim()) {
          console.warn(`Pencarian YouTube yt-dlp keluar dengan kode ${code}`);
          resolve([]);
          return;
        }

        const lines = stdoutData.trim().split('\n');
        const results: YTSong[] = [];

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line.trim());
            const id = `yt_${data.id}`;
            const cleanTitle = (data.title || 'Lagu')
              .replace(/\(Official.*?\)/gi, '')
              .replace(/\[Official.*?\]/gi, '')
              .replace(/\(Lyric.*?\)/gi, '')
              .replace(/\[Lyric.*?\]/gi, '')
              .trim();

            const artistName = data.channel || data.uploader || 'Artis YouTube';
            const coverUrl =
              data.thumbnails?.[data.thumbnails.length - 1]?.url ||
              `https://i.ytimg.com/vi/${data.id}/hqdefault.jpg`;

            const songObj: YTSong = {
              id,
              title: cleanTitle,
              artist_id: `yt_artist_${data.channel_id || data.id}`,
              artist_name: artistName,
              album_id: null,
              album_title: 'YouTube Music Track',
              duration_seconds: Math.round(data.duration || 180),
              cover_url: coverUrl,
              play_count: data.view_count || 1000,
              is_liked: false,
              file_path: `${id}.m4a`,
              mime_type: 'audio/mp4',
              is_public: true,
            };

            // Simpan ke inMemoryStore agar rute /songs/:id langsung menemukannya
            inMemoryStore.songs.set(id, songObj);
            inMemoryStore.artists.set(songObj.artist_id, {
              id: songObj.artist_id,
              name: artistName,
              bio: `Koleksi resmi dari channel ${artistName}`,
              image_url: coverUrl,
            });

            results.push(songObj);
          } catch (e) {
            // Lewati baris yang gagal diurai
          }
        }

        resolve(results);
      });

      child.on('error', (err) => {
        console.error('Gagal menjalankan yt-dlp:', err);
        resolve([]);
      });
    });
  }

  /**
   * Memastikan file audio asli telah tersedia di server lokal.
   * Jika belum ada, download otomatis berkas audio berkualitas jernih (M4A/AAC).
   */
  public static async ensureAudioFile(songId: string): Promise<string> {
    const rawId = songId.replace(/^yt_/, '');
    const audioDir = path.join(ENV.STORAGE_PATH, 'audio');
    if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

    const targetFile = path.join(audioDir, `yt_${rawId}.m4a`);

    // 1. Jika sudah pernah di-cache/download di server, langsung kembalikan path
    if (fs.existsSync(targetFile)) {
      return targetFile;
    }

    // 2. Jika saat ini sedang di-download oleh request lain, tunggu antreannya
    if (activeDownloads.has(songId)) {
      return activeDownloads.get(songId)!;
    }

    // 3. Jalankan download instan audio 128-192kbps AAC
    const downloadPromise = new Promise<string>((resolve, reject) => {
      console.log(`⬇️ Mengunduh audio YouTube asli untuk ID: ${rawId}...`);
      const url = `https://www.youtube.com/watch?v=${rawId}`;
      const args = [
        '-f', 'ba[ext=m4a]/ba',
        '--no-playlist',
        '--no-warnings',
        '-o', targetFile,
        url,
      ];

      const child = spawn(YTDLP_PATH, args);

      child.on('close', (code) => {
        activeDownloads.delete(songId);
        if (code === 0 && fs.existsSync(targetFile)) {
          console.log(`✅ Sukses mengunduh audio asli: ${targetFile}`);
          resolve(targetFile);
        } else {
          console.error(`Gagal mengunduh audio YouTube (exit code ${code})`);
          reject(new Error(`Gagal mengunduh audio YouTube, code: ${code}`));
        }
      });

      child.on('error', (err) => {
        activeDownloads.delete(songId);
        console.error('Error proses download yt-dlp:', err);
        reject(err);
      });
    });

    activeDownloads.set(songId, downloadPromise);
    return downloadPromise;
  }

  /**
   * Mengambil metadata single video YouTube jika belum ada di cache memory
   */
  public static async getSongMetadata(songId: string): Promise<YTSong | null> {
    const rawId = songId.replace(/^yt_/, '');
    return new Promise((resolve) => {
      const url = `https://www.youtube.com/watch?v=${rawId}`;
      const args = [url, '--dump-json', '--no-playlist', '--no-warnings'];

      const child = spawn(YTDLP_PATH, args);
      let stdoutData = '';

      child.stdout.on('data', (chunk) => {
        stdoutData += chunk.toString();
      });

      child.on('close', (code) => {
        if (code === 0 && stdoutData.trim()) {
          try {
            const data = JSON.parse(stdoutData.trim());
            const cleanTitle = (data.title || 'Lagu')
              .replace(/\(Official.*?\)/gi, '')
              .replace(/\[Official.*?\]/gi, '')
              .replace(/\(Lyric.*?\)/gi, '')
              .replace(/\[Lyric.*?\]/gi, '')
              .trim();

            const artistName = data.channel || data.uploader || 'Artis YouTube';
            const coverUrl =
              data.thumbnails?.[data.thumbnails.length - 1]?.url ||
              `https://i.ytimg.com/vi/${data.id}/hqdefault.jpg`;

            const songObj: YTSong = {
              id: songId,
              title: cleanTitle,
              artist_id: `yt_artist_${data.channel_id || data.id}`,
              artist_name: artistName,
              album_id: null,
              album_title: 'YouTube Music Track',
              duration_seconds: Math.round(data.duration || 180),
              cover_url: coverUrl,
              play_count: data.view_count || 1000,
              is_liked: false,
              file_path: `${songId}.m4a`,
              mime_type: 'audio/mp4',
              is_public: true,
            };

            inMemoryStore.songs.set(songId, songObj);
            resolve(songObj);
            return;
          } catch (e) {
            // Error parsing
          }
        }
        resolve(null);
      });

      child.on('error', () => resolve(null));
    });
  }

  /**
   * Ekstrak seluruh daftar lagu dari link Playlist YouTube / YouTube Music
   */
  public static async getPlaylistSongs(playlistUrlOrId: string, limit: number = 200): Promise<YTSong[]> {
    let cleanUrl = playlistUrlOrId.trim();
    if (cleanUrl.startsWith('PL') || cleanUrl.startsWith('OLAK5uy_') || cleanUrl.startsWith('RD')) {
      cleanUrl = `https://www.youtube.com/playlist?list=${cleanUrl}`;
    }

    return new Promise((resolve) => {
      const args = [
        cleanUrl,
        '--dump-json',
        '--flat-playlist',
        '--no-warnings',
        '--ignore-errors',
        '--playlist-end', String(limit),
      ];

      const child = spawn(YTDLP_PATH, args);
      let stdoutData = '';

      child.stdout.on('data', (chunk) => {
        stdoutData += chunk.toString();
      });

      child.on('close', (code) => {
        const lines = stdoutData.trim().split('\n');
        const results: YTSong[] = [];

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line.trim());
            if (!data.id) continue;
            const id = `yt_${data.id}`;
            const cleanTitle = (data.title || 'Lagu')
              .replace(/\(Official.*?\)/gi, '')
              .replace(/\[Official.*?\]/gi, '')
              .replace(/\(Lyric.*?\)/gi, '')
              .replace(/\[Lyric.*?\]/gi, '')
              .trim();

            const artistName =
              data.channel ||
              data.uploader ||
              (Array.isArray(data.creators) ? data.creators.join(', ') : 'Artis YouTube');

            let coverUrl = `https://i.ytimg.com/vi/${data.id}/hqdefault.jpg`;
            if (Array.isArray(data.thumbnails) && data.thumbnails.length > 0) {
              coverUrl = data.thumbnails[data.thumbnails.length - 1].url || coverUrl;
            }

            const songObj: YTSong = {
              id,
              title: cleanTitle,
              artist_id: `yt_artist_${data.channel_id || data.id}`,
              artist_name: artistName,
              album_id: null,
              album_title: data.playlist_title || 'YouTube Playlist Track',
              duration_seconds: Math.round(data.duration || 180),
              cover_url: coverUrl,
              play_count: data.view_count || 1000,
              is_liked: false,
              file_path: `${id}.m4a`,
              mime_type: 'audio/mp4',
              is_public: true,
            };

            inMemoryStore.songs.set(id, songObj);
            inMemoryStore.artists.set(songObj.artist_id, {
              id: songObj.artist_id,
              name: artistName,
              bio: `Channel ${artistName}`,
              image_url: coverUrl,
            });

            results.push(songObj);
          } catch (e) {
            // Ignore parse errors on individual lines
          }
        }

        resolve(results);
      });

      child.on('error', (err) => {
        console.error('Error saat mengambil playlist yt-dlp:', err);
        resolve([]);
      });
    });
  }

  /**
   * Menyelesaikan 1 item: bisa berupa URL video YouTube, YouTube ID, atau judul lagu teks
   */
  public static async resolveSingleSong(queryOrUrl: string): Promise<YTSong | null> {
    const trimmed = queryOrUrl.trim();
    if (!trimmed) return null;

    // 1. Cek apakah format URL YouTube
    const ytMatch = trimmed.match(/(?:youtu\.be\/|v=|\/embed\/|\/v\/|shorts\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) {
      return YoutubeService.getSongMetadata(`yt_${ytMatch[1]}`);
    }

    // 2. Cek apakah format ID yt_...
    if (trimmed.startsWith('yt_')) {
      return YoutubeService.getSongMetadata(trimmed);
    }

    // 3. Pencarian judul lagu via searchSongs
    const searchRes = await YoutubeService.searchSongs(trimmed, 1);
    return searchRes[0] || null;
  }
}

