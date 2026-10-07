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

let cachedYtdlpPath: string | null = null;

async function resolveYtdlpBinary(): Promise<string> {
  if (cachedYtdlpPath && fs.existsSync(cachedYtdlpPath)) {
    return cachedYtdlpPath;
  }

  const possiblePaths = [
    '/usr/local/bin/yt-dlp',
    '/usr/bin/yt-dlp',
    '/home/gani/.local/bin/yt-dlp',
    path.join(process.env.HOME || '', '.local/bin/yt-dlp'),
    path.join(ENV.STORAGE_PATH, 'yt-dlp'),
    '/tmp/yt-dlp',
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      cachedYtdlpPath = p;
      return p;
    }
  }

  // Jika belum ada di server, coba unduh binary mandiri yt-dlp ke folder storage
  try {
    const storageYtdlp = path.join(ENV.STORAGE_PATH, 'yt-dlp');
    if (!fs.existsSync(ENV.STORAGE_PATH)) {
      fs.mkdirSync(ENV.STORAGE_PATH, { recursive: true });
    }
    console.log('📥 Mempersiapkan binary yt-dlp mandiri untuk server...');
    const res = await fetch('https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp');
    if (res.ok) {
      const buffer = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(storageYtdlp, buffer, { mode: 0o755 });
      cachedYtdlpPath = storageYtdlp;
      console.log('✅ yt-dlp mandiri siap di:', storageYtdlp);
      return storageYtdlp;
    }
  } catch (err: any) {
    console.warn('⚠️ Tidak dapat mengunduh yt-dlp otomatis:', err.message);
  }

  cachedYtdlpPath = 'yt-dlp';
  return 'yt-dlp';
}

// Antrean download aktif untuk menghindari download ganda file yang sama
const activeDownloads = new Map<string, Promise<string>>();

export class YoutubeService {
  /**
   * Pencarian langsung YouTube via web scraping publik (Sangat cepat ~100ms, tanpa dependensi yt-dlp/python)
   */
  public static async searchDirectYouTube(query: string, limit: number = 10): Promise<YTSong[]> {
    try {
      const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%253D%253D`;
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        },
      });

      if (!res.ok) return [];

      const html = await res.text();
      const match = html.match(/var ytInitialData = ({.*?});<\/script>/s);
      if (!match) return [];

      const json = JSON.parse(match[1]);
      const contents =
        json.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
      const results: YTSong[] = [];

      for (const section of contents) {
        const itemContents = section.itemSectionRenderer?.contents || [];
        for (const item of itemContents) {
          if (!item.videoRenderer) continue;
          const v = item.videoRenderer;
          const videoId = v.videoId;
          if (!videoId) continue;

          const rawTitle = v.title?.runs?.[0]?.text || 'Lagu';
          const cleanTitle = rawTitle
            .replace(/\(Official.*?\)/gi, '')
            .replace(/\[Official.*?\]/gi, '')
            .replace(/\(Lyric.*?\)/gi, '')
            .replace(/\[Lyric.*?\]/gi, '')
            .trim();

          const artistName = v.ownerText?.runs?.[0]?.text || 'Artis YouTube';
          let coverUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
          if (Array.isArray(v.thumbnail?.thumbnails) && v.thumbnail.thumbnails.length > 0) {
            coverUrl = v.thumbnail.thumbnails[v.thumbnail.thumbnails.length - 1].url || coverUrl;
          }

          // Parse durasi (misal "3:45" atau "1:15:30")
          const durationText = v.lengthText?.simpleText || '3:30';
          const parts = durationText.split(':').map(Number);
          let durationSeconds = 210;
          if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            durationSeconds = parts[0] * 60 + parts[1];
          } else if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
            durationSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
          }

          const id = `yt_${videoId}`;
          const songObj: YTSong = {
            id,
            title: cleanTitle,
            artist_id: `yt_artist_${v.channelId || videoId}`,
            artist_name: artistName,
            album_id: null,
            album_title: 'YouTube Track',
            duration_seconds: durationSeconds,
            cover_url: coverUrl,
            play_count: 5000,
            is_liked: false,
            file_path: `${id}.m4a`,
            mime_type: 'audio/mp4',
            is_public: true,
          };

          inMemoryStore.songs.set(id, songObj);
          inMemoryStore.artists.set(songObj.artist_id, {
            id: songObj.artist_id,
            name: artistName,
            bio: `Channel resmi ${artistName}`,
            image_url: coverUrl,
          });

          results.push(songObj);
          if (results.length >= limit) break;
        }
        if (results.length >= limit) break;
      }

      return results;
    } catch (err: any) {
      console.warn('Pencarian langsung YouTube web gagal:', err.message);
      return [];
    }
  }

  /**
   * Cari lagu di YouTube Music / YouTube (Mendukung Direct Web + Fallback yt-dlp)
   */
  public static async searchSongs(query: string, limit: number = 10): Promise<YTSong[]> {
    // 1. Coba pencarian cepat via HTTP scraping langsung (instan, tanpa proses python berat)
    const directResults = await YoutubeService.searchDirectYouTube(query, limit);
    if (directResults.length > 0) {
      return directResults;
    }

    // 2. Fallback: gunakan yt-dlp jika direct scraping tidak menemukan hasil
    const ytdlpBin = await resolveYtdlpBinary();
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

      const child = spawn(ytdlpBin, args);
      let stdoutData = '';

      child.stdout.on('data', (chunk) => {
        stdoutData += chunk.toString();
      });

      child.on('close', (code) => {
        if (code !== 0 && !stdoutData.trim()) {
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
    const ytdlpBin = await resolveYtdlpBinary();
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

      const child = spawn(ytdlpBin, args);

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
    const ytdlpBin = await resolveYtdlpBinary();
    return new Promise((resolve) => {
      const url = `https://www.youtube.com/watch?v=${rawId}`;
      const args = [url, '--dump-json', '--no-playlist', '--no-warnings'];

      const child = spawn(ytdlpBin, args);
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

    const ytdlpBin = await resolveYtdlpBinary();
    return new Promise((resolve) => {
      const args = [
        cleanUrl,
        '--dump-json',
        '--flat-playlist',
        '--no-warnings',
        '--ignore-errors',
        '--playlist-end', String(limit),
      ];

      const child = spawn(ytdlpBin, args);
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

