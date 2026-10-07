import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Heart, Plus, Music, Play, Trash2, Clock, Sparkles } from 'lucide-react';
import { apiRequest } from '../services/api';
import { ISong, IPlaylist } from '../types';
import { Navbar } from '../components/Navbar';
import { ImportLikedModal } from '../components/ImportLikedModal';
import { useAudio } from '../context/AudioContext';
import { useAuth } from '../context/AuthContext';

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const LibraryPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'liked';
  const [activeTab, setActiveTab] = useState<'liked' | 'playlists' | 'history'>(
    initialTab as any
  );

  const [likedSongs, setLikedSongs] = useState<ISong[]>([]);
  const [playlists, setPlaylists] = useState<IPlaylist[]>([]);
  const [history, setHistory] = useState<ISong[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDesc, setNewDesc] = useState<string>('');

  const { playSong } = useAudio();
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const loadData = async () => {
    if (!user) return;
    try {
      if (activeTab === 'liked') {
        const res = await apiRequest('/user/likes');
        if (res.success) setLikedSongs(res.data);
      } else if (activeTab === 'playlists') {
        const res = await apiRequest('/playlists');
        if (res.success) setPlaylists(res.data);
      } else if (activeTab === 'history') {
        const res = await apiRequest('/user/history');
        if (res.success) setHistory(res.data);
      }
    } catch (err) {
      console.warn('Gagal memuat library:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, user]);

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const res = await apiRequest('/playlists', {
        method: 'POST',
        body: JSON.stringify({ title: newTitle.trim(), description: newDesc.trim() }),
      });
      if (res.success) {
        setIsModalOpen(false);
        setNewTitle('');
        setNewDesc('');
        loadData();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (!user) {
    return (
      <div className="flex-1 overflow-y-auto pb-24">
        <Navbar />
        <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
          <Music className="w-16 h-16 text-spotify-subtext" />
          <h2 className="text-2xl font-bold text-white">Masuk untuk melihat koleksi musik Anda</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="px-8 py-3 rounded-full bg-white text-black font-bold text-sm hover:scale-105 transition-transform"
            >
              Masuk Sekarang
            </button>
            <button
              onClick={() => login('user@spotifylite.com', 'user123')}
              className="px-6 py-3 rounded-full bg-[#242424] text-white border border-white/20 font-bold text-sm hover:bg-[#333] transition-colors"
            >
              ⚡ Masuk Cepat (Akun Demo)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto pb-24">
      <Navbar />

      <main className="px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Koleksi Kamu</h1>
          <div className="flex items-center gap-2">
            {activeTab === 'liked' && (
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-x-2 px-4 py-2 rounded-full bg-spotify-green text-black font-bold text-xs hover:scale-105 transition-all shadow-md"
              >
                <Sparkles className="w-4 h-4 fill-black stroke-black" />
                <span>Import Lagu (Spotify / YouTube)</span>
              </button>
            )}
            {activeTab === 'playlists' && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-x-2 px-4 py-2 rounded-full bg-spotify-green text-black font-bold text-xs hover:scale-105 transition-all shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Playlist</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-x-2 border-b border-white/10 pb-3">
          <button
            onClick={() => setActiveTab('liked')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              activeTab === 'liked' ? 'bg-white text-black' : 'bg-[#242424] text-white hover:bg-[#333]'
            }`}
          >
            Lagu yang Disukai
          </button>
          <button
            onClick={() => setActiveTab('playlists')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              activeTab === 'playlists' ? 'bg-white text-black' : 'bg-[#242424] text-white hover:bg-[#333]'
            }`}
          >
            Playlist Saya
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              activeTab === 'history' ? 'bg-white text-black' : 'bg-[#242424] text-white hover:bg-[#333]'
            }`}
          >
            Riwayat Pemutaran
          </button>
        </div>

        {/* Tab 1: Liked Songs */}
        {activeTab === 'liked' && (
          <div className="space-y-4">
            {likedSongs.length > 0 && (
              <button
                onClick={() => playSong(likedSongs[0], likedSongs)}
                className="w-12 h-12 rounded-full bg-spotify-green flex items-center justify-center text-black hover:scale-105 active:scale-95 transition-transform shadow-lg"
              >
                <Play className="w-6 h-6 fill-black stroke-black ml-0.5" />
              </button>
            )}

            <div className="divide-y divide-white/5">
              {likedSongs.map((song, idx) => (
                <div
                  key={song.id}
                  onClick={() => playSong(song, likedSongs)}
                  className="group flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-x-4 truncate">
                    <span className="w-5 text-xs text-spotify-subtext font-mono text-center">
                      {idx + 1}
                    </span>
                    <img
                      src={song.cover_url || 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=100'}
                      alt={song.title}
                      className="w-10 h-10 rounded object-cover"
                    />
                    <div className="truncate">
                      <p className="text-sm font-semibold text-white truncate group-hover:text-spotify-green">
                        {song.title}
                      </p>
                      <p className="text-xs text-spotify-subtext truncate">
                        {song.artist_name || 'Artis'}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-spotify-subtext font-mono">
                    {formatDuration(song.duration_seconds)}
                  </span>
                </div>
              ))}
            </div>

            {likedSongs.length === 0 && (
              <div className="text-center py-16">
                <Heart className="w-12 h-12 mx-auto text-spotify-subtext mb-3" />
                <p className="text-base font-semibold text-white">Belum ada lagu yang disukai</p>
                <p className="text-xs text-spotify-subtext mt-1 max-w-sm mx-auto">
                  Tekan ikon hati pada lagu yang Anda suka, atau import semua lagu dari playlist YouTube hasil transfer ekstensi Spotify Anda.
                </p>
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="mt-5 inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-spotify-green text-black font-bold text-xs hover:scale-105 transition-all shadow-lg"
                >
                  <Sparkles className="w-4 h-4 fill-black stroke-black" />
                  <span>Import Playlist Lagu Sekarang</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Playlists */}
        {activeTab === 'playlists' && (
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
                    {pl.song_count || 0} lagu
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: History */}
        {activeTab === 'history' && (
          <div className="divide-y divide-white/5">
            {history.map((song, idx) => (
              <div
                key={song.id + idx}
                onClick={() => playSong(song, history)}
                className="group flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-x-4 truncate">
                  <span className="w-5 text-xs text-spotify-subtext font-mono text-center">
                    {idx + 1}
                  </span>
                  <img
                    src={song.cover_url || 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=100'}
                    alt={song.title}
                    className="w-10 h-10 rounded object-cover"
                  />
                  <div className="truncate">
                    <p className="text-sm font-semibold text-white truncate group-hover:text-spotify-green">
                      {song.title}
                    </p>
                    <p className="text-xs text-spotify-subtext truncate">
                      {song.artist_name || 'Artis'}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-spotify-subtext font-mono">
                  {formatDuration(song.duration_seconds)}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal Buat Playlist */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreatePlaylist}
            className="w-full max-w-md bg-[#242424] rounded-2xl p-6 border border-white/10 shadow-2xl space-y-4"
          >
            <h3 className="text-xl font-bold text-white">Buat Playlist Baru</h3>
            <div>
              <label className="text-xs font-semibold text-spotify-subtext">Judul Playlist</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Contoh: Lagu Pengantar Tidur"
                className="w-full mt-1 bg-[#181818] text-white text-sm px-4 py-2.5 rounded-lg border border-white/10 focus:border-spotify-green focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-spotify-subtext">Deskripsi (Opsional)</label>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Deskripsi singkat playlist..."
                className="w-full mt-1 bg-[#181818] text-white text-sm px-4 py-2.5 rounded-lg border border-white/10 focus:border-spotify-green focus:outline-none resize-none h-20"
              />
            </div>
            <div className="flex justify-end gap-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-full text-xs font-semibold text-white hover:bg-white/10 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-full bg-spotify-green text-black font-bold text-xs hover:scale-105 transition-all shadow-md"
              >
                Simpan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Import Lagu dari Spotify / YouTube */}
      <ImportLikedModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
};
