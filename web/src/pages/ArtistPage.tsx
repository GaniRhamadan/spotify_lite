import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Play, Pause, Shuffle, Radio, Heart, BadgeCheck, Music2 } from 'lucide-react';
import { apiRequest } from '../services/api';
import { IArtist, ISong } from '../types';
import { Navbar } from '../components/Navbar';
import { useAudio } from '../context/AudioContext';

function formatDuration(sec: number): string {
  if (isNaN(sec) || sec <= 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const ArtistPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [artist, setArtist] = useState<IArtist | null>(null);
  const [songs, setSongs] = useState<ISong[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [showFullBio, setShowFullBio] = useState<boolean>(false);
  const { currentSong, isPlaying, playSong, togglePlayPause, toggleShuffle } = useAudio();

  useEffect(() => {
    if (!id) return;
    const fetchArtistData = async () => {
      setLoading(true);
      try {
        const decoded = decodeURIComponent(id);
        const res = await apiRequest(`/artists/${encodeURIComponent(decoded)}?name=${encodeURIComponent(decoded)}`);
        if (res.success && res.data) {
          setArtist(res.data.artist);
          setSongs(res.data.top_songs || []);
        }
      } catch (err) {
        console.warn('Gagal memuat artis:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchArtistData();
  }, [id]);

  const isCurrentArtistPlaying =
    isPlaying && songs.some((s) => s.id === currentSong?.id);

  const handlePlayTopSongs = () => {
    if (songs.length === 0) return;
    if (isCurrentArtistPlaying) {
      togglePlayPause();
    } else {
      playSong(songs[0], songs);
    }
  };

  const handleShufflePlay = () => {
    if (songs.length === 0) return;
    toggleShuffle();
    const randomIdx = Math.floor(Math.random() * songs.length);
    playSong(songs[randomIdx], songs);
  };

  const displayName = artist?.name || decodeURIComponent(id || 'Artis');

  return (
    <div className="flex-1 overflow-y-auto pb-24 select-none">
      <Navbar />

      {/* Hero Header YouTube Music / Spotify Style */}
      <div className="relative p-8 md:p-10 bg-gradient-to-b from-[#2d2d2d] via-[#1a1a1a] to-spotify-base flex flex-col md:flex-row items-start md:items-end gap-6 border-b border-white/5">
        <div className="relative group shrink-0">
          <img
            src={
              artist?.image_url ||
              songs[0]?.cover_url ||
              'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600'
            }
            alt={displayName}
            className="w-40 h-40 md:w-52 md:h-52 rounded-full object-cover shadow-2xl border-2 border-white/10"
          />
        </div>

        <div className="flex flex-col gap-y-3 flex-1 min-w-0">
          <div className="flex items-center gap-x-2 text-spotify-green text-xs font-semibold uppercase tracking-wider">
            <BadgeCheck className="w-5 h-5 fill-spotify-green text-black" />
            <span>Artis Terverifikasi</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight truncate">
            {displayName}
          </h1>

          <p className="text-sm text-spotify-subtext font-medium">
            {artist?.monthly_listeners || `${songs.length * 120 + 350}K pendengar bulanan`}
          </p>

          {artist?.bio && (
            <div className="text-xs text-white/70 max-w-2xl leading-relaxed">
              <p className={showFullBio ? '' : 'line-clamp-2'}>{artist.bio}</p>
              {artist.bio.length > 90 && (
                <button
                  onClick={() => setShowFullBio(!showFullBio)}
                  className="text-white font-semibold text-xs mt-1 hover:underline uppercase tracking-wider"
                >
                  {showFullBio ? 'Sembunyikan' : 'Selengkapnya'}
                </button>
              )}
            </div>
          )}

          {/* Action Buttons: Shuffle, Mix/Radio, Subscribe */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={handlePlayTopSongs}
              className="px-6 py-2.5 rounded-full bg-spotify-green text-black font-bold text-sm flex items-center gap-x-2 hover:scale-105 active:scale-95 transition-all shadow-lg"
            >
              {isCurrentArtistPlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-black stroke-black" />
                  <span>Jeda</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-black stroke-black ml-0.5" />
                  <span>Putar</span>
                </>
              )}
            </button>

            <button
              onClick={handleShufflePlay}
              className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium text-sm flex items-center gap-x-2 transition-colors border border-white/10"
            >
              <Shuffle className="w-4 h-4" />
              <span>Acak</span>
            </button>

            <button
              onClick={handlePlayTopSongs}
              className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium text-sm flex items-center gap-x-2 transition-colors border border-white/10"
            >
              <Radio className="w-4 h-4" />
              <span>Mix / Radio</span>
            </button>

            <button
              onClick={() => setIsSubscribed(!isSubscribed)}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                isSubscribed
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-white text-black hover:bg-white/90'
              }`}
            >
              {isSubscribed ? 'Berlangganan' : 'Langganan'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="px-8 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white tracking-tight">Karya & Lagu Terpopuler</h2>
          <span className="text-xs text-spotify-subtext font-mono">
            {songs.length} Lagu Tersedia
          </span>
        </div>

        {loading ? (
          <div className="space-y-3 py-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 bg-white/5 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : songs.length === 0 ? (
          <div className="text-center py-20 text-spotify-subtext">
            <Music2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-base text-white font-semibold">Belum ada karya lagu yang ditemukan</p>
            <p className="text-xs mt-1">Coba cari artis lain di pencarian atau putar lagu rekomendasi.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {songs.map((song, index) => {
              const isCurrent = currentSong?.id === song.id;
              // Format plays count
              const playsFormatted =
                song.play_count > 1000000
                  ? `${(song.play_count / 1000000).toFixed(1)}M plays`
                  : song.play_count > 1000
                  ? `${Math.round(song.play_count / 1000)}K plays`
                  : `${(index + 3) * 14}M plays`;

              return (
                <div
                  key={song.id}
                  onClick={() => playSong(song, songs)}
                  className={`group flex items-center justify-between py-3 px-3 rounded-lg hover:bg-white/10 transition-colors cursor-pointer ${
                    isCurrent ? 'bg-white/5' : ''
                  }`}
                >
                  <div className="flex items-center gap-x-4 truncate flex-1 min-w-0">
                    {/* Index / Play indicator */}
                    <div className="w-6 text-center text-xs text-spotify-subtext font-mono flex items-center justify-center">
                      {isCurrent && isPlaying ? (
                        <div className="flex items-end gap-0.5 h-3">
                          <span className="w-0.5 h-3 bg-spotify-green animate-bounce" />
                          <span className="w-0.5 h-2 bg-spotify-green animate-pulse" />
                          <span className="w-0.5 h-3 bg-spotify-green animate-bounce" />
                        </div>
                      ) : (
                        <span className="group-hover:hidden">{index + 1}</span>
                      )}
                      <Play className="w-3.5 h-3.5 fill-white text-white hidden group-hover:block" />
                    </div>

                    <img
                      src={
                        song.cover_url ||
                        'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=100'
                      }
                      alt={song.title}
                      className="w-11 h-11 rounded-md object-cover shadow-sm shrink-0"
                    />

                    <div className="truncate flex-1 min-w-0 pr-4">
                      <p
                        className={`text-sm font-semibold truncate ${
                          isCurrent ? 'text-spotify-green' : 'text-white'
                        }`}
                      >
                        {song.title}
                      </p>
                      <p className="text-xs text-spotify-subtext truncate mt-0.5">
                        {song.artist_name || displayName}
                      </p>
                    </div>
                  </div>

                  {/* Play count / Stats */}
                  <div className="hidden sm:block text-xs text-spotify-subtext font-mono w-28 text-left">
                    {playsFormatted}
                  </div>

                  {/* Album / Single */}
                  <div className="hidden md:block text-xs text-spotify-subtext truncate w-36 text-left">
                    {song.album_title || 'Single'}
                  </div>

                  {/* Actions & Duration */}
                  <div className="flex items-center gap-x-3 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className="text-spotify-subtext hover:text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Heart className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-spotify-subtext font-mono w-10 text-right">
                      {formatDuration(song.duration_seconds)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
