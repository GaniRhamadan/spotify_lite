import { Request, Response } from 'express';
import { pool, getIsPostgresConnected, inMemoryStore } from '../config/database';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { cacheService } from '../services/cache.service';
import { YoutubeService } from '../services/youtube.service';

export class SongController {
  public static async getAllSongs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '20', 10);
      const offset = (page - 1) * limit;
      const currentUserId = req.user?.userId;

      // Cek cache Redis untuk halaman 1 default (jika user tidak login)
      const cacheKey = `songs:page:${page}:limit:${limit}`;
      if (!currentUserId && page === 1) {
        const cached = await cacheService.get(cacheKey);
        if (cached) {
          res.status(200).json(JSON.parse(cached));
          return;
        }
      }

      if (getIsPostgresConnected()) {
        const query = `
          SELECT 
            s.id, s.title, s.duration_seconds, s.file_size, s.mime_type, s.bitrate,
            s.cover_url, s.lyrics, s.play_count, s.created_at,
            a.id as artist_id, a.name as artist_name,
            alb.id as album_id, alb.title as album_title,
            CASE WHEN ls.song_id IS NOT NULL THEN true ELSE false END as is_liked
          FROM songs s
          LEFT JOIN artists a ON s.artist_id = a.id
          LEFT JOIN albums alb ON s.album_id = alb.id
          LEFT JOIN liked_songs ls ON s.id = ls.song_id AND ls.user_id = $1
          WHERE s.is_public = true
          ORDER BY s.created_at DESC
          LIMIT $2 OFFSET $3
        `;
        const result = await pool.query(query, [currentUserId || null, limit, offset]);

        const countQuery = 'SELECT COUNT(*) FROM songs WHERE is_public = true';
        const countRes = await pool.query(countQuery);
        const total = parseInt(countRes.rows[0].count, 10);

        const responsePayload = {
          success: true,
          data: result.rows,
          meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };

        if (!currentUserId && page === 1) {
          await cacheService.set(cacheKey, JSON.stringify(responsePayload), 120);
        }

        res.status(200).json(responsePayload);
      } else {
        // Fallback in-memory
        const songsArray = Array.from(inMemoryStore.songs.values());
        const total = songsArray.length;
        const paged = songsArray.slice(offset, offset + limit).map(s => {
          const artist = inMemoryStore.artists.get(s.artist_id);
          const album = s.album_id ? inMemoryStore.albums.get(s.album_id) : null;
          const isLiked = currentUserId ? inMemoryStore.liked_songs.has(`${currentUserId}:${s.id}`) : false;
          return {
            ...s,
            artist_name: artist?.name || 'Artis Tidak Diketahui',
            album_title: album?.title || null,
            is_liked: isLiked,
          };
        });

        res.status(200).json({
          success: true,
          data: paged,
          meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
        });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Gagal mengambil lagu: ' + error.message });
    }
  }

  public static async getSongById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const currentUserId = req.user?.userId;

      if (getIsPostgresConnected()) {
        const query = `
          SELECT 
            s.*,
            a.name as artist_name, a.image_url as artist_image,
            alb.title as album_title, alb.cover_url as album_cover,
            CASE WHEN ls.song_id IS NOT NULL THEN true ELSE false END as is_liked
          FROM songs s
          LEFT JOIN artists a ON s.artist_id = a.id
          LEFT JOIN albums alb ON s.album_id = alb.id
          LEFT JOIN liked_songs ls ON s.id = ls.song_id AND ls.user_id = $1
          WHERE s.id = $2
        `;
        const result = await pool.query(query, [currentUserId || null, id]);
        if (result.rows.length === 0) {
          res.status(404).json({ success: false, message: 'Lagu tidak ditemukan' });
          return;
        }
        res.status(200).json({ success: true, data: result.rows[0] });
      } else {
        let song = inMemoryStore.songs.get(id);
        if (!song && id.startsWith('yt_')) {
          song = await YoutubeService.getSongMetadata(id);
        }
        if (!song) {
          res.status(404).json({ success: false, message: 'Lagu tidak ditemukan' });
          return;
        }
        const artist = inMemoryStore.artists.get(song.artist_id);
        const album = song.album_id ? inMemoryStore.albums.get(song.album_id) : null;
        const isLiked = currentUserId ? inMemoryStore.liked_songs.has(`${currentUserId}:${id}`) : false;

        res.status(200).json({
          success: true,
          data: {
            ...song,
            artist_name: artist?.name || 'Artis Tidak Diketahui',
            album_title: album?.title || null,
            is_liked: isLiked,
          },
        });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Gagal memuat lagu: ' + error.message });
    }
  }

  public static async getTrending(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (getIsPostgresConnected()) {
        const query = `
          SELECT s.id, s.title, s.duration_seconds, s.cover_url, s.play_count,
                 a.name as artist_name
          FROM songs s
          LEFT JOIN artists a ON s.artist_id = a.id
          ORDER BY s.play_count DESC, s.created_at DESC
          LIMIT 10
        `;
        const result = await pool.query(query);
        res.status(200).json({ success: true, data: result.rows });
      } else {
        const sorted = Array.from(inMemoryStore.songs.values())
          .sort((a, b) => (b.play_count || 0) - (a.play_count || 0))
          .slice(0, 10)
          .map(s => {
            const artist = inMemoryStore.artists.get(s.artist_id);
            return {
              ...s,
              artist_name: artist?.name || 'Artis Tidak Diketahui',
            };
          });
        res.status(200).json({ success: true, data: sorted });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Gagal memuat lagu trending' });
    }
  }

  public static async getRecommendations(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const seedArtist = ((req.query.seed_artist as string) || '').trim();
      const seedGenre = ((req.query.seed_genre as string) || '').trim();
      const limit = parseInt((req.query.limit as string) || '15', 10);

      const targetSeed = seedArtist || seedGenre || 'pop';

      // Cari rekomendasi lagu online berdasarkan kesukaan/kebiasaan dengar user
      let recommendedSongs: any[] = [];
      try {
        const query = seedArtist 
          ? `${seedArtist} radio mix songs`
          : `${targetSeed} top hits music mix`;
        recommendedSongs = await YoutubeService.searchSongs(query, limit);
      } catch (err: any) {
        console.warn('Gagal fetch rekomendasi online:', err.message);
      }

      // Gabungkan lagu database lokal jika cocok
      let localMatches: any[] = [];
      if (getIsPostgresConnected()) {
        try {
          const lRes = await pool.query(
            `SELECT s.id, s.title, s.duration_seconds, s.cover_url, s.play_count, a.name as artist_name
             FROM songs s
             LEFT JOIN artists a ON s.artist_id = a.id
             WHERE LOWER(a.name) LIKE LOWER($1) OR LOWER(s.title) LIKE LOWER($1)
             LIMIT 5`,
            [`%${targetSeed}%`]
          );
          localMatches = lRes.rows;
        } catch {}
      } else {
        localMatches = Array.from(inMemoryStore.songs.values())
          .filter(s => {
            const art = inMemoryStore.artists.get(s.artist_id);
            return (
              art?.name.toLowerCase().includes(targetSeed.toLowerCase()) ||
              s.title.toLowerCase().includes(targetSeed.toLowerCase())
            );
          })
          .slice(0, 5)
          .map(s => {
            const art = inMemoryStore.artists.get(s.artist_id);
            return { ...s, artist_name: art?.name || 'Artis' };
          });
      }

      const seen = new Set<string>();
      const combined: any[] = [];
      for (const item of [...recommendedSongs, ...localMatches]) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          combined.push(item);
        }
      }

      res.status(200).json({
        success: true,
        data: combined.slice(0, limit),
        algorithm_basis: {
          seed: targetSeed,
          type: seedArtist ? 'artist' : 'genre',
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Gagal memuat rekomendasi: ' + error.message });
    }
  }

  public static async getSongLyrics(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const titleQuery = ((req.query.title as string) || '').trim();
      const artistQuery = ((req.query.artist as string) || '').trim();

      // 1. Cek lirik di database lokal atau in-memory
      let localLyrics = '';
      if (getIsPostgresConnected()) {
        const r = await pool.query('SELECT lyrics FROM songs WHERE id = $1', [id]);
        if (r.rows.length > 0 && r.rows[0].lyrics) {
          localLyrics = r.rows[0].lyrics;
        }
      } else {
        const s = inMemoryStore.songs.get(id);
        if (s && s.lyrics) localLyrics = s.lyrics;
      }

      if (localLyrics) {
        res.status(200).json({
          success: true,
          data: {
            lyrics: localLyrics,
            syncedLyrics: localLyrics.includes('[00:') ? localLyrics : null,
            source: 'local',
          },
        });
        return;
      }

      // 2. Ambil judul dan nama artis untuk pencarian online LRCLIB
      let targetTitle = titleQuery;
      let targetArtist = artistQuery;

      if (!targetTitle && id.startsWith('yt_')) {
        const meta = await YoutubeService.getSongMetadata(id);
        if (meta) {
          targetTitle = meta.title;
          targetArtist = meta.artist_name;
        }
      }

      if (targetTitle) {
        const cleanTitle = targetTitle
          .replace(/\(Official.*?\)/gi, '')
          .replace(/\[Official.*?\]/gi, '')
          .replace(/\(Lyric.*?\)/gi, '')
          .replace(/\[Lyric.*?\]/gi, '')
          .replace(/\(Audio.*?\)/gi, '')
          .replace(/\[Audio.*?\]/gi, '')
          .trim();

        // Cari via LRCLIB (Exact Match)
        try {
          const lrclibUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(
            cleanTitle
          )}&artist_name=${encodeURIComponent(targetArtist || '')}`;
          const lrcRes = await fetch(lrclibUrl, { headers: { 'User-Agent': 'SpotifyLite/1.0' } });
          if (lrcRes.ok) {
            const data: any = await lrcRes.json();
            const synced = data.syncedLyrics || null;
            const plain = data.plainLyrics || data.syncedLyrics || null;
            if (plain || synced) {
              res.status(200).json({
                success: true,
                data: {
                  lyrics: plain,
                  syncedLyrics: synced,
                  source: 'lrclib',
                },
              });
              return;
            }
          }
        } catch {}

        // Fallback: Cari via LRCLIB Search Query
        try {
          const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(
            `${cleanTitle} ${targetArtist || ''}`.trim()
          )}`;
          const searchRes = await fetch(searchUrl, { headers: { 'User-Agent': 'SpotifyLite/1.0' } });
          if (searchRes.ok) {
            const list: any = await searchRes.json();
            if (Array.isArray(list) && list.length > 0) {
              const item = list[0];
              res.status(200).json({
                success: true,
                data: {
                  lyrics: item.plainLyrics || item.syncedLyrics,
                  syncedLyrics: item.syncedLyrics || null,
                  source: 'lrclib',
                },
              });
              return;
            }
          }
        } catch {}
      }

      res.status(200).json({
        success: true,
        data: {
          lyrics: null,
          syncedLyrics: null,
          source: 'none',
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Gagal memuat lirik: ' + error.message });
    }
  }
}
