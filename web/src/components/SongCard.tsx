import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, Heart, Plus } from 'lucide-react';
import { ISong } from '../types';
import { useAudio } from '../context/AudioContext';
import { apiRequest } from '../services/api';
import { AddToPlaylistModal } from './AddToPlaylistModal';

interface SongCardProps {
  song: ISong;
  playlist?: ISong[];
}

export const SongCard: React.FC<SongCardProps> = ({ song, playlist }) => {
  const navigate = useNavigate();
  const { currentSong, isPlaying, playSong, togglePlayPause } = useAudio();
  const [isLiked, setIsLiked] = useState<boolean>(!!song.is_liked);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);

  const isCurrent = currentSong?.id === song.id;

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrent) {
      togglePlayPause();
    } else {
      playSong(song, playlist);
    }
  };

  const handleToggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await apiRequest(`/user/likes/${song.id}`, { method: 'POST' });
      if (res.success) {
        setIsLiked(res.is_liked);
      }
    } catch {}
  };

  const handleOpenPlaylistModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaylistModalOpen(true);
  };

  return (
    <>
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

          {/* Quick Action Overlay (Like & Add to Playlist) */}
          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleToggleLike}
              className="w-7 h-7 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md flex items-center justify-center text-white transition-colors"
              title={isLiked ? 'Hapus dari Favorit' : 'Sukai Lagu'}
            >
              <Heart
                className={`w-3.5 h-3.5 ${
                  isLiked ? 'fill-spotify-green text-spotify-green' : 'text-white'
                }`}
              />
            </button>
            <button
              onClick={handleOpenPlaylistModal}
              className="w-7 h-7 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md flex items-center justify-center text-white transition-colors"
              title="Tambah ke Playlist"
            >
              <Plus className="w-4 h-4 text-white" />
            </button>
          </div>

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
          <p
            onClick={(e) => {
              e.stopPropagation();
              const artistTarget = song.artist_name || song.artist_id;
              if (artistTarget) {
                navigate(`/artist/${encodeURIComponent(artistTarget)}`);
              }
            }}
            className="text-xs text-spotify-subtext truncate mt-1 hover:underline hover:text-white cursor-pointer"
            title={`Lihat karya ${song.artist_name || 'Artis'}`}
          >
            {song.artist_name || 'Artis Tidak Diketahui'}
          </p>
        </div>
      </div>

      <AddToPlaylistModal
        song={song}
        isOpen={isPlaylistModalOpen}
        onClose={() => setIsPlaylistModalOpen(false)}
      />
    </>
  );
};

