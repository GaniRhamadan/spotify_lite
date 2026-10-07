import React from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Maximize2,
  Heart,
  ListMusic,
  Video,
  FileText,
} from 'lucide-react';
import { useAudio } from '../context/AudioContext';
import { useNavigate } from 'react-router-dom';

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const BottomPlayer: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isShuffle,
    repeatMode,
    togglePlayPause,
    nextSong,
    prevSong,
    seekTo,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    toggleLikeCurrentSong,
    setIsFullscreenOpen,
    setFullscreenTab,
  } = useAudio();

  if (!currentSong) return null;

  return (
    <footer className="h-20 md:h-[84px] w-full bg-black border-t border-[#1e1e1e] px-4 flex items-center justify-between z-40 select-none shrink-0">
      {/* 1. KIRI: Info Lagu Saat Ini */}
      <div className="flex items-center gap-x-3 w-1/4 min-w-[180px]">
        <img
          src={currentSong.cover_url || 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=500'}
          alt={currentSong.title}
          className="w-14 h-14 rounded-md object-cover cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setIsFullscreenOpen(true)}
        />
        <div className="flex flex-col truncate">
          <span
            onClick={() => setIsFullscreenOpen(true)}
            className="text-sm font-medium text-white truncate hover:underline cursor-pointer"
          >
            {currentSong.title}
          </span>
          <span
            onClick={(e) => {
              e.stopPropagation();
              const artistTarget = currentSong.artist_name || currentSong.artist_id;
              if (artistTarget) {
                navigate(`/artist/${encodeURIComponent(artistTarget)}`);
              }
            }}
            className="text-xs text-spotify-subtext truncate hover:underline hover:text-white cursor-pointer"
            title={`Lihat karya ${currentSong.artist_name || 'Artis'}`}
          >
            {currentSong.artist_name || 'Artis'}
          </span>
        </div>
        <button
          onClick={toggleLikeCurrentSong}
          className="text-spotify-subtext hover:text-white p-1 ml-1 transition-colors"
        >
          <Heart
            className={`w-4 h-4 ${
              currentSong.is_liked ? 'fill-spotify-green text-spotify-green' : ''
            }`}
          />
        </button>
      </div>

      {/* 2. TENGAH: Kontrol Pemutar Utama & Seek Bar */}
      <div className="flex flex-col items-center gap-y-1.5 w-2/4 max-w-2xl">
        <div className="flex items-center gap-x-6">
          {/* Shuffle */}
          <button
            onClick={toggleShuffle}
            className={`p-1 transition-colors ${
              isShuffle ? 'text-spotify-green' : 'text-spotify-subtext hover:text-white'
            }`}
          >
            <Shuffle className="w-4 h-4" />
          </button>

          {/* Previous */}
          <button
            onClick={prevSong}
            className="text-spotify-subtext hover:text-white transition-colors"
          >
            <SkipBack className="w-5 h-5 fill-current" />
          </button>

          {/* Play / Pause Tombol Utama */}
          <button
            onClick={togglePlayPause}
            className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black hover:scale-105 active:scale-95 transition-all shadow-md"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-black stroke-black" />
            ) : (
              <Play className="w-4 h-4 fill-black stroke-black ml-0.5" />
            )}
          </button>

          {/* Next */}
          <button
            onClick={nextSong}
            className="text-spotify-subtext hover:text-white transition-colors"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>

          {/* Repeat */}
          <button
            onClick={toggleRepeat}
            className={`p-1 transition-colors relative ${
              repeatMode !== 'off' ? 'text-spotify-green' : 'text-spotify-subtext hover:text-white'
            }`}
          >
            {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
          </button>
        </div>

        {/* Progress Bar & Durasi */}
        <div className="flex items-center gap-x-2 w-full text-[11px] text-spotify-subtext">
          <span className="w-8 text-right font-mono">{formatTime(currentTime)}</span>
          <div className="relative flex-1 group flex items-center">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => seekTo(parseFloat(e.target.value))}
              className="w-full h-1 bg-[#4d4d4d] rounded-lg appearance-none cursor-pointer"
            />
          </div>
          <span className="w-8 text-left font-mono">{formatTime(duration)}</span>
        </div>
      </div>

      {/* 3. KANAN: Video, Lirik, Antrean, Volume, Layar Penuh */}
      <div className="flex items-center justify-end gap-x-3 w-1/4">
        {/* Mode Video YouTube Music */}
        <button
          onClick={() => {
            setFullscreenTab('video');
            setIsFullscreenOpen(true);
          }}
          className="text-spotify-subtext hover:text-red-400 transition-colors"
          title="Tonton Video Musik (Mode YouTube)"
        >
          <Video className="w-4 h-4" />
        </button>

        {/* Lirik Lagu */}
        <button
          onClick={() => {
            setFullscreenTab('lyrics');
            setIsFullscreenOpen(true);
          }}
          className="text-spotify-subtext hover:text-spotify-green transition-colors"
          title="Lirik Lagu (Karaoke Sync)"
        >
          <FileText className="w-4 h-4" />
        </button>

        {/* Antrean / Now Playing Fullscreen */}
        <button
          onClick={() => {
            setFullscreenTab('queue');
            setIsFullscreenOpen(true);
          }}
          className="text-spotify-subtext hover:text-white transition-colors"
          title="Buka Antrean Lagu"
        >
          <ListMusic className="w-4 h-4" />
        </button>

        {/* Kontrol Volume */}
        <div className="flex items-center gap-x-2 group">
          <button
            onClick={toggleMute}
            className="text-spotify-subtext hover:text-white transition-colors"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-20 h-1 bg-[#4d4d4d] rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Tombol Maximize */}
        <button
          onClick={() => setIsFullscreenOpen(true)}
          className="text-spotify-subtext hover:text-white transition-colors ml-2"
          title="Layar Penuh"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </footer>
  );
};
