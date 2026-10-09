import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Pause, Trash2, ArrowUp, ArrowDown, Music, Plus, Search, X } from 'lucide-react';
import { apiRequest } from '../services/api';
import { IPlaylist, ISong } from '../types';
import { Navbar } from '../components/Navbar';
import { useAudio } from '../context/AudioContext';
import { useAuth } from '../context/AuthContext';

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const PlaylistDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [playlist, setPlaylist] = useState<IPlaylist | null>(null);
  const [songs, setSongs] = useState<ISong[]>([]);
  const [isAddSongOpen, setIsAddSongOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ISong[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { currentSong, isPlaying, playSong, togglePlayPause } = useAudio();
  const { user } = useAuth();
  const navigate = useNavigate();

  const loadPlaylist = async () => {
    try {
      const res = await apiRequest(`/playlists/${id}`);
      if (res.success) {
        setPlaylist(res.data);
        setSongs(res.data.songs || []);
      }
    } catch (err) {
      console.error('Gagal memuat playlist:', err);
    }
  };

  useEffect(() => {
    loadPlaylist();
  }, [id]);

  useEffect(() => {
    if (!isAddSongOpen) {
      setSearchQuery('');
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const query = searchQuery.trim() || 'pop';
        const res = await apiRequest(`/search?q=${encodeURIComponent(query)}`);
        if (res.success && res.data) {
          setSearchResults(res.data.songs || []);
        }
      } catch (e) {
        console.error('Gagal mencari lagu:', e);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, isAddSongOpen]);

  const handleAddSong = async (songId: string) => {
    try {
      const res = await apiRequest(`/playlists/${id}/songs`, {
        method: 'POST',
        body: JSON.stringify({ songId }),
      });
      if (res.success) {
        await loadPlaylist();
      }
    } catch (err: any) {
      alert(err.message || 'Gagal menambahkan lagu');
    }
  };

  const isPlaylistPlaying =
    isPlaying && songs.some((s) => s.id === currentSong?.id);

  const handlePlayAll = () => {
    if (songs.length === 0) return;
    if (isPlaylistPlaying) {
      togglePlayPause();
    } else {
      playSong(songs[0], songs);
    }
  };

  const handleRemoveSong = async (songId: string) => {
    try {
      const res = await apiRequest(`/playlists/${id}/songs/${songId}`, {
        method: 'DELETE',
      });
      if (res.success) {
        setSongs(songs.filter((s) => s.id !== songId));
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= songs.length) return;

    const newSongs = [...songs];
    const temp = newSongs[index];
    newSongs[index] = newSongs[targetIdx];
    newSongs[targetIdx] = temp;
    setSongs(newSongs);

    try {
      await apiRequest(`/playlists/${id}/reorder`, {
        method: 'PUT',
        body: JSON.stringify({ songIds: newSongs.map((s) => s.id) }),
      });
    } catch (err) {
      console.error('Gagal sinkronisasi urutan:', err);
    }
  };

  if (!playlist) {
    return (
      <div className="flex-1 overflow-y-auto pb-24">
        <Navbar />
        <div className="p-8 text-center text-spotify-subtext">Memuat playlist...</div>
      </div>
    );
  }

  const isOwner = user?.id === playlist.user_id;

  return (
    <div className="flex-1 overflow-y-auto pb-24">
      <Navbar />

      {/* Playlist Hero Banner */}
      <div className="p-8 bg-gradient-to-b from-[#403058] to-spotify-base flex items-end gap-x-6">
        <img
          src={playlist.cover_url || 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=500'}
          alt={playlist.title}
          className="w-48 h-48 rounded-lg shadow-2xl object-cover"
        />
        <div className="flex flex-col gap-y-2">
          <span className="text-xs uppercase font-bold text-white tracking-widest">PLAYLIST</span>
          <h1 className="text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
            {playlist.title}
          </h1>
          <p className="text-sm text-spotify-subtext max-w-xl line-clamp-2">
            {playlist.description || 'Kumpulan lagu pilihan Spotify Lite'}
          </p>
          <div className="text-xs text-white/80 font-medium mt-1">
            {songs.length} lagu • Sekitar {Math.round(songs.reduce((a, c) => a + c.duration_seconds, 0) / 60)} menit
          </div>
        </div>
      </div>

      <main className="px-8 py-6 space-y-6">
        {/* Play Action Bar */}
        <div className="flex items-center gap-x-4">
          <button
            onClick={handlePlayAll}
            className="w-14 h-14 rounded-full bg-spotify-green flex items-center justify-center text-black hover:scale-105 active:scale-95 transition-transform shadow-xl"
          >
            {isPlaylistPlaying ? (
              <Pause className="w-7 h-7 fill-black stroke-black" />
            ) : (
              <Play className="w-7 h-7 fill-black stroke-black ml-1" />
            )}
          </button>

          {isOwner && (
            <button
              onClick={() => setIsAddSongOpen(true)}
              className="flex items-center gap-x-2 px-4 py-2.5 rounded-full border border-white/20 hover:border-white text-sm font-semibold text-white transition-colors hover:bg-white/5 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Lagu</span>
            </button>
          )}
        </div>

        {/* Tabel Lagu Playlist */}
        <div className="divide-y divide-white/5">
          {songs.map((song, index) => {
            const isCurrent = currentSong?.id === song.id;
            return (
              <div
                key={song.id}
                className="group flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/10 transition-colors"
              >
                <div
                  onClick={() => playSong(song, songs)}
                  className="flex items-center gap-x-4 truncate flex-1 cursor-pointer"
                >
                  <span className="w-6 text-xs text-spotify-subtext font-mono text-center">
                    {index + 1}
                  </span>
                  <img
                    src={song.cover_url || 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=100'}
                    alt={song.title}
                    className="w-10 h-10 rounded object-cover"
                  />
                  <div className="truncate">
                    <p
                      className={`text-sm font-semibold truncate ${
                        isCurrent ? 'text-spotify-green' : 'text-white'
                      }`}
                    >
                      {song.title}
                    </p>
                    <p className="text-xs text-spotify-subtext truncate">
                      {song.artist_name || 'Artis'}
                    </p>
                  </div>
                </div>

                {/* Tombol Reorder & Hapus (Khusus Pemilik) */}
                <div className="flex items-center gap-x-3">
                  {isOwner && (
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleMove(index, 'up')}
                        disabled={index === 0}
                        title="Pindah ke Atas"
                        className="p-1 text-spotify-subtext hover:text-white disabled:opacity-20"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleMove(index, 'down')}
                        disabled={index === songs.length - 1}
                        title="Pindah ke Bawah"
                        className="p-1 text-spotify-subtext hover:text-white disabled:opacity-20"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveSong(song.id)}
                        title="Hapus dari Playlist"
                        className="p-1 text-spotify-subtext hover:red-400 ml-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <span className="text-xs text-spotify-subtext font-mono">
                    {formatDuration(song.duration_seconds)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {songs.length === 0 && (
          <div className="text-center py-16">
            <Music className="w-12 h-12 mx-auto text-spotify-subtext mb-3" />
            <p className="text-base font-semibold text-white">Playlist ini masih kosong</p>
            <p className="text-xs text-spotify-subtext mt-1 mb-4">
              Cari lagu favorit Anda dan tambahkan ke playlist ini.
            </p>
            {isOwner && (
              <button
                onClick={() => setIsAddSongOpen(true)}
                className="px-5 py-2.5 rounded-full bg-spotify-green text-black font-bold text-xs hover:scale-105 active:scale-95 transition-transform"
              >
                Cari & Tambah Lagu
              </button>
            )}
          </div>
        )}
      </main>

      {/* Modal Tambah Lagu */}
      {isAddSongOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#282828] w-full max-w-lg rounded-xl shadow-2xl p-6 border border-white/10 flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h2 className="text-xl font-bold text-white">Tambah Lagu ke Playlist</h2>
              <button
                onClick={() => setIsAddSongOpen(false)}
                className="p-1 text-spotify-subtext hover:text-white rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-spotify-subtext" />
              <input
                type="text"
                placeholder="Cari lagu (contoh: 18, One Direction, Queen)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#3e3e3e] text-white pl-10 pr-4 py-2.5 rounded-full text-sm outline-none focus:ring-2 focus:ring-spotify-green"
                autoFocus
              />
            </div>

            <div className="mt-4 flex-1 overflow-y-auto divide-y divide-white/5 space-y-2 pr-1">
              {isSearching && (
                <div className="text-center py-8 text-xs text-spotify-subtext">Mencari katalog...</div>
              )}
              {!isSearching &&
                searchResults.map((s) => {
                  const isAlreadyAdded = songs.some((ps) => ps.id === s.id);
                  return (
                    <div key={s.id} className="flex items-center justify-between py-2.5 pt-2.5">
                      <div className="flex items-center gap-3 truncate flex-1">
                        <img
                          src={s.cover_url || 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=100'}
                          alt={s.title}
                          className="w-10 h-10 rounded object-cover flex-shrink-0"
                        />
                        <div className="truncate">
                          <p className="text-sm font-semibold text-white truncate">{s.title}</p>
                          <p className="text-xs text-spotify-subtext truncate">{s.artist_name || 'Artis'}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddSong(s.id)}
                        disabled={isAlreadyAdded}
                        className={`ml-3 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                          isAlreadyAdded
                            ? 'bg-white/10 text-spotify-subtext cursor-default'
                            : 'bg-spotify-green text-black hover:scale-105 active:scale-95'
                        }`}
                      >
                        {isAlreadyAdded ? 'Ditambahkan' : 'Tambah'}
                      </button>
                    </div>
                  );
                })}
              {!isSearching && searchQuery.trim() && searchResults.length === 0 && (
                <div className="text-center py-8 text-xs text-spotify-subtext">
                  Tidak ada lagu yang cocok dengan pencarian Anda
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
