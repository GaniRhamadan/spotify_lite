import React, { useState } from 'react';
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Heart,
  ListMusic,
  FileText,
} from 'lucide-react';
import { useAudio } from '../context/AudioContext';

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const FullscreenPlayer: React.FC = () => {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    isShuffle,
    repeatMode,
    queue,
    isFullscreenOpen,
    togglePlayPause,
    nextSong,
    prevSong,
    seekTo,
    toggleShuffle,
    toggleRepeat,
    toggleLikeCurrentSong,
    setIsFullscreenOpen,
    playSong,
  } = useAudio();

  const [activeTab, setActiveTab] = useState<'cover' | 'lyrics' | 'queue'>('cover');

  if (!isFullscreenOpen || !currentSong) return null;

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-[#2e1d3b] via-[#121212] to-black flex flex-col justify-between p-8 select-none animate-in fade-in duration-300">
      {/* 1. Header Layar Penuh */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsFullscreenOpen(false)}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
        >
          <ChevronDown className="w-6 h-6" />
        </button>

        <div className="flex flex-col items-center">
          <span className="text-xs uppercase tracking-widest text-spotify-subtext font-semibold">
            MEMUTAR DARI {currentSong.album_title ? `ALBUM` : 'KATALOG'}
          </span>
          <span className="text-sm font-bold text-white">
            {currentSong.album_title || 'Spotify Lite'}
          </span>
        </div>

        {/* Tab Switcher: Cover / Lirik / Antrean */}
        <div className="flex items-center gap-x-2 bg-black/40 p-1 rounded-full border border-white/10">
          <button
            onClick={() => setActiveTab('cover')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              activeTab === 'cover' ? 'bg-white text-black' : 'text-spotify-subtext hover:text-white'
            }`}
          >
            Lagu
          </button>
          <button
            onClick={() => setActiveTab('lyrics')}
            className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-all ${
              activeTab === 'lyrics' ? 'bg-white text-black' : 'text-spotify-subtext hover:text-white'
            }`}
          >
            <FileText className="w-3 h-3" />
            Lirik
          </button>
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-all ${
              activeTab === 'queue' ? 'bg-white text-black' : 'text-spotify-subtext hover:text-white'
            }`}
          >
            <ListMusic className="w-3 h-3" />
            Antrean ({queue.length})
          </button>
        </div>
      </div>

      {/* 2. Konten Tengah Berdasarkan Tab */}
      <div className="flex-1 flex items-center justify-center py-6 overflow-hidden">
        {activeTab === 'cover' && (
          <div className="flex flex-col items-center max-w-md w-full">
            <div className="relative w-80 h-80 rounded-2xl overflow-hidden shadow-2xl shadow-purple-900/30 border border-white/10 group">
              <img
                src={currentSong.cover_url || 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=600'}
                alt={currentSong.title}
                className={`w-full h-full object-cover transition-transform duration-700 ${
                  isPlaying ? 'scale-105' : 'scale-100'
                }`}
              />
            </div>
          </div>
        )}

        {activeTab === 'lyrics' && (
          <div className="max-w-2xl w-full h-full overflow-y-auto px-6 py-4 flex flex-col items-center text-center">
            <h3 className="text-xl font-bold text-white mb-6">Lirik Lagu</h3>
            {currentSong.lyrics ? (
              <div className="space-y-4 text-lg font-medium text-spotify-subtext leading-relaxed">
                {currentSong.lyrics.split('\n').map((line, idx) => (
                  <p key={idx} className="hover:text-white transition-colors cursor-pointer">
                    {line}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-spotify-subtext text-sm italic">
                Lirik belum tersedia untuk lagu ini.
              </p>
            )}
          </div>
        )}

        {activeTab === 'queue' && (
          <div className="max-w-xl w-full h-full overflow-y-auto px-4 divide-y divide-white/5">
            <h3 className="text-base font-bold text-white mb-3">Antrean Berikutnya</h3>
            {queue.map((item, index) => (
              <div
                key={item.id + index}
                onClick={() => playSong(item, queue)}
                className={`flex items-center justify-between py-2.5 px-3 rounded-lg cursor-pointer transition-colors ${
                  item.id === currentSong.id ? 'bg-white/10 text-spotify-green' : 'hover:bg-white/5 text-white'
                }`}
              >
                <div className="flex items-center gap-x-3 truncate">
                  <span className="text-xs font-mono text-spotify-subtext w-4">{index + 1}</span>
                  <img
                    src={item.cover_url || 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=100'}
                    alt={item.title}
                    className="w-10 h-10 rounded object-cover"
                  />
                  <div className="truncate">
                    <p className="text-sm font-semibold truncate">{item.title}</p>
                    <p className="text-xs text-spotify-subtext truncate">{item.artist_name || 'Artis'}</p>
                  </div>
                </div>
                <span className="text-xs text-spotify-subtext font-mono">
                  {formatTime(item.duration_seconds)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Kontrol Bawah Layar Penuh */}
      <div className="max-w-2xl mx-auto w-full flex flex-col gap-y-4">
        {/* Judul & Tombol Like */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold text-white tracking-tight">{currentSong.title}</h2>
            <p className="text-base text-spotify-subtext font-medium">{currentSong.artist_name || 'Artis'}</p>
          </div>
          <button
            onClick={toggleLikeCurrentSong}
            className="p-2 text-spotify-subtext hover:text-white transition-colors"
          >
            <Heart
              className={`w-7 h-7 ${
                currentSong.is_liked ? 'fill-spotify-green text-spotify-green' : ''
              }`}
            />
          </button>
        </div>

        {/* Seek Slider */}
        <div className="flex flex-col gap-y-1">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={(e) => seekTo(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-[#4d4d4d] rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-spotify-subtext font-mono">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Tombol Pemutar Besar */}
        <div className="flex items-center justify-between px-6 pt-2">
          <button
            onClick={toggleShuffle}
            className={`p-2 transition-colors ${
              isShuffle ? 'text-spotify-green' : 'text-spotify-subtext hover:text-white'
            }`}
          >
            <Shuffle className="w-5 h-5" />
          </button>

          <button
            onClick={prevSong}
            className="p-2 text-white hover:text-spotify-green transition-colors"
          >
            <SkipBack className="w-8 h-8 fill-current" />
          </button>

          <button
            onClick={togglePlayPause}
            className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-black hover:scale-105 active:scale-95 transition-transform shadow-xl"
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 fill-black stroke-black" />
            ) : (
              <Play className="w-8 h-8 fill-black stroke-black ml-1" />
            )}
          </button>

          <button
            onClick={nextSong}
            className="p-2 text-white hover:text-spotify-green transition-colors"
          >
            <SkipForward className="w-8 h-8 fill-current" />
          </button>

          <button
            onClick={toggleRepeat}
            className={`p-2 transition-colors ${
              repeatMode !== 'off' ? 'text-spotify-green' : 'text-spotify-subtext hover:text-white'
            }`}
          >
            <Repeat className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
