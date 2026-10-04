import React from 'react';
import { Play, Pause } from 'lucide-react';
import { ISong } from '../types';
import { useAudio } from '../context/AudioContext';

interface SongCardProps {
  song: ISong;
  playlist?: ISong[];
}

export const SongCard: React.FC<SongCardProps> = ({ song, playlist }) => {
  const { currentSong, isPlaying, playSong, togglePlayPause } = useAudio();

  const isCurrent = currentSong?.id === song.id;

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrent) {
      togglePlayPause();
    } else {
      playSong(song, playlist);
    }
  };

  return (
    <div
      onClick={() => playSong(song, playlist)}
      className="group relative p-3 rounded-lg bg-spotify-surface hover:bg-spotify-card-hover transition-all duration-300 cursor-pointer flex flex-col gap-y-3"
    >
      {/* Cover Image Container */}
      <div className="relative w-full aspect-square rounded-md overflow-hidden bg-spotify-card shadow-md">
        <img
          src={song.cover_url || 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=500&auto=format&fit=crop&q=80'}
          alt={song.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Floating Green Play Button */}
        <button
          onClick={handlePlayClick}
          className={`absolute bottom-2 right-2 w-10 h-10 rounded-full bg-spotify-green flex items-center justify-center shadow-xl text-black hover:scale-110 active:scale-95 transition-all duration-200 ${
            isCurrent && isPlaying
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'
          }`}
        >
          {isCurrent && isPlaying ? (
            <Pause className="w-5 h-5 fill-black stroke-black" />
          ) : (
            <Play className="w-5 h-5 fill-black stroke-black ml-0.5" />
          )}
        </button>
      </div>

      {/* Info Lagu */}
      <div className="flex flex-col min-h-[44px]">
        <h4
          className={`text-sm font-semibold truncate ${
            isCurrent ? 'text-spotify-green' : 'text-white'
          }`}
        >
          {song.title}
        </h4>
        <p className="text-xs text-spotify-subtext truncate mt-1">
          {song.artist_name || 'Artis Tidak Diketahui'}
        </p>
      </div>
    </div>
  );
};
