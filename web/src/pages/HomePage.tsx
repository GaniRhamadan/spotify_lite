import React, { useEffect, useState } from 'react';
import { apiRequest } from '../services/api';
import { ISong, IPlaylist } from '../types';
import { SongCard } from '../components/SongCard';
import { Navbar } from '../components/Navbar';
import { Play, Sparkles } from 'lucide-react';
import { useAudio } from '../context/AudioContext';
import { useNavigate } from 'react-router-dom';

export const HomePage: React.FC = () => {
  const [songs, setSongs] = useState<ISong[]>([]);
  const [trending, setTrending] = useState<ISong[]>([]);
  const [recommendations, setRecommendations] = useState<ISong[]>([]);
  const [recBasis, setRecBasis] = useState<string>('Pop');
  const [playlists, setPlaylists] = useState<IPlaylist[]>([]);
  const [greeting, setGreeting] = useState<string>('Selamat Datang');
  const { playSong } = useAudio();
  const navigate = useNavigate();

  const fetchRecommendations = async () => {
    try {
      let seed = 'Pop';
      let isArtist = false;
      try {
        const stored = JSON.parse(localStorage.getItem('listening_habits') || '{"artists":{}}');
        const artistKeys = Object.keys(stored.artists || {});
        if (artistKeys.length > 0) {
          const top = artistKeys.reduce((a, b) => (stored.artists[a] > stored.artists[b] ? a : b));
          if (top) {
            seed = top;
            isArtist = true;
          }
        }
      } catch {}

      setRecBasis(seed);
      const query = isArtist
        ? `seed_artist=${encodeURIComponent(seed)}`
        : `seed_genre=${encodeURIComponent(seed)}`;
      const res = await apiRequest(`/songs/recommendations?${query}&limit=10`);
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setRecommendations(res.data);
      }
    } catch (err) {
      console.warn('Gagal memuat rekomendasi personal:', err);
    }
  };

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Selamat Pagi');
    else if (hour < 15) setGreeting('Selamat Siang');
    else if (hour < 18) setGreeting('Selamat Sore');
    else setGreeting('Selamat Malam');

    const fetchData = async () => {
      try {
        const [songsRes, trendingRes, playlistsRes] = await Promise.all([
          apiRequest('/songs?limit=50'),
          apiRequest('/songs/trending'),
          apiRequest('/playlists'),
        ]);

        if (songsRes.success) setSongs(songsRes.data);
        if (trendingRes.success) setTrending(trendingRes.data);
        if (playlistsRes.success) setPlaylists(playlistsRes.data);
      } catch (err) {
        console.warn('Gagal memuat data beranda:', err);
      }
    };

    fetchData();
    fetchRecommendations();

    const handleHabitsUpdated = () => {
      fetchRecommendations();
    };

    window.addEventListener('listening_habits_updated', handleHabitsUpdated);
    return () => {
      window.removeEventListener('listening_habits_updated', handleHabitsUpdated);
    };
  }, []);

  return (
    <div className="flex-1 overflow-y-auto pb-24">
      <Navbar />

      <main className="px-8 py-6 space-y-8">
        {/* Salam & Quick Access Bar */}
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-4">{greeting}</h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {songs.slice(0, 6).map((song) => (
              <div
                key={song.id}
                onClick={() => playSong(song, songs)}
                className="group flex items-center bg-[#282828]/60 hover:bg-[#383838] transition-all rounded-md overflow-hidden cursor-pointer shadow-sm relative pr-3"
              >
                <img
                  src={song.cover_url || 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=100'}
                  alt={song.title}
                  className="w-16 h-16 object-cover"
                />
                <span className="ml-3 font-semibold text-sm text-white truncate flex-1">
                  {song.title}
                </span>
                <button
                  className="w-10 h-10 rounded-full bg-spotify-green flex items-center justify-center text-black opacity-0 group-hover:opacity-100 hover:scale-105 active:scale-95 transition-all shadow-md ml-2"
                >
                  <Play className="w-5 h-5 fill-black stroke-black ml-0.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Section: Trending & Terpopuler */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white tracking-tight">Lagu Paling Sering Diputar</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {trending.map((song) => (
              <SongCard key={song.id} song={song} playlist={trending} />
            ))}
          </div>
        </div>

        {/* Section Algoritma Personal: Dibuat Untuk Kamu */}
        {recommendations.length > 0 && (
          <div className="p-6 rounded-2xl bg-gradient-to-r from-[#1f1633] via-[#161f28] to-[#121212] border border-white/10 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
              <div className="flex items-center gap-x-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center shadow">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Dibuat Untuk Kamu</h2>
                  <p className="text-xs text-spotify-subtext">
                    Algoritma rekomendasi berdasarkan kesukaanmu mendengarkan{' '}
                    <span className="text-spotify-green font-semibold underline underline-offset-2">
                      {recBasis}
                    </span>
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full bg-white/10 text-white/90 border border-white/10 w-fit">
                Algoritma Cerdas
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {recommendations.map((song) => (
                <SongCard key={song.id} song={song} playlist={recommendations} />
              ))}
            </div>
          </div>
        )}

        {/* Section: Playlist Unggulan */}
        {playlists.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white tracking-tight">Playlist Rekomendasi</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {playlists.map((pl) => (
                <div
                  key={pl.id}
                  onClick={() => navigate(`/playlist/${pl.id}`)}
                  className="group relative p-3 rounded-lg bg-spotify-surface hover:bg-spotify-card-hover transition-all duration-300 cursor-pointer flex flex-col gap-y-3"
                >
                  <div className="relative w-full aspect-square rounded-md overflow-hidden bg-spotify-card shadow-md">
                    <img
                      src={pl.cover_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500'}
                      alt={pl.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="flex flex-col">
                    <h4 className="text-sm font-semibold text-white truncate">{pl.title}</h4>
                    <p className="text-xs text-spotify-subtext truncate mt-1">
                      {pl.description || `${pl.song_count || 0} lagu`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section: Semua Lagu Katalog */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white tracking-tight">Koleksi Musik Terbaru</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {songs.map((song) => (
              <SongCard key={song.id} song={song} playlist={songs} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};
