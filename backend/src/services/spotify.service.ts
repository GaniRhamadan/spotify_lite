export interface SpotifyTrack {
  title: string;
  artist: string;
  duration?: number;
}

export class SpotifyService {
  /**
   * Ekstrak daftar lagu dari link publik Spotify (playlist, album, track)
   */
  public static async extractSpotifyTracks(url: string): Promise<{ title?: string; tracks: SpotifyTrack[] }> {
    const trimmed = url.trim();

    // Deteksi khusus jika pengguna memasukkan collection/tracks (Lagu yang Disukai privat akun)
    if (trimmed.includes('collection/tracks')) {
      throw new Error(
        'Link "open.spotify.com/collection/tracks" adalah halaman privat akun Spotify Anda (tidak dapat diakses publik tanpa login akun Anda). ' +
        'Solusi Cepat 10 Detik di Spotify:\n' +
        '1. Buka aplikasi Spotify di Laptop/HP Anda.\n' +
        '2. Buka "Lagu yang Disukai", tekan Ctrl+A (pilih semua lagu).\n' +
        '3. Klik Kanan -> Tambahkan ke Playlist Baru (misal beri nama "Favorit").\n' +
        '4. Klik Kanan playlist baru tersebut -> Bagikan -> Salin Tautan Playlist (open.spotify.com/playlist/...).\n' +
        '5. Tempel link playlist tersebut ke sini, dan sistem akan langsung memasukkan semua lagunya!'
      );
    }

    const match = trimmed.match(/(playlist|album|track)\/([a-zA-Z0-9]+)/);
    if (!match) {
      throw new Error(
        'Format link Spotify tidak dikenali. Gunakan format open.spotify.com/playlist/... atau open.spotify.com/album/...'
      );
    }

    const [_, type, id] = match;
    const embedUrl = `https://open.spotify.com/embed/${type}/${id}`;

    const res = await fetch(embedUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!res.ok) {
      throw new Error(`Gagal membuka link Spotify (Status HTTP ${res.status}). Pastikan playlist atau album bersifat publik.`);
    }

    const html = await res.text();
    const nextMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);
    if (!nextMatch) {
      throw new Error('Tidak dapat membaca metadata playlist Spotify. Pastikan link dapat diakses publik.');
    }

    try {
      const json = JSON.parse(nextMatch[1]);
      const entity = json.props?.pageProps?.state?.data?.entity;
      if (!entity) {
        throw new Error('Struktur data playlist Spotify kosong atau tidak ditemukan.');
      }

      if (type === 'track') {
        const title = entity.title || entity.name || 'Unknown Track';
        const artist = entity.subtitle || 'Unknown Artist';
        return {
          title,
          tracks: [{ title, artist, duration: Math.round((entity.duration || 0) / 1000) }],
        };
      }

      const trackList = entity.trackList || [];
      const tracks: SpotifyTrack[] = trackList.map((t: any) => ({
        title: t.title || 'Unknown Track',
        artist: t.subtitle || entity.subtitle || '',
        duration: Math.round((t.duration || 0) / 1000),
      }));

      return {
        title: entity.title || entity.name,
        tracks,
      };
    } catch (e: any) {
      throw new Error('Gagal mengurai daftar lagu Spotify: ' + e.message);
    }
  }
}
