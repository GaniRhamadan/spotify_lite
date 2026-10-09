import React, { useState, useEffect } from 'react';
import { X, Plus, Check, ListMusic, Loader2 } from 'lucide-react';
import { ISong, IPlaylist } from '../types';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface AddToPlaylistModalProps {
  song: ISong | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({
  song,
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState<IPlaylist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [addedPlaylistIds, setAddedPlaylistIds] = useState<Set<string>>(new Set());
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !user) return;

    setIsLoading(true);
    setAddedPlaylistIds(new Set());
    setStatusMessage(null);

    apiRequest('/playlists')
      .then((res) => {
        if (res.success) {
          // Hanya tampilkan playlist milik pengguna sendiri
          setPlaylists(res.data.filter((p: IPlaylist) => p.user_id === user.id));
        }
      })
      .catch((err) => {
        console.warn('Gagal memuat playlist pengguna:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen, user]);

  if (!isOpen || !song) return null;

  const handleAddToPlaylist = async (playlist: IPlaylist) => {
    try {
      const res = await apiRequest(`/playlists/${playlist.id}/songs`, {
        method: 'POST',
        body: JSON.stringify({ songId: song.id }),
      });

      if (res.success) {
        setAddedPlaylistIds((prev) => new Set(prev).add(playlist.id));
        setStatusMessage(`Ditambahkan ke "${playlist.title}"`);
        setTimeout(() => setStatusMessage(null), 3000);
      }
    } catch (err: any) {
      alert(err.message || 'Gagal menambahkan lagu ke playlist');
    }
  };

  const handleCreateAndAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const createRes = await apiRequest('/playlists', {
        method: 'POST',
        body: JSON.stringify({ title: newTitle.trim(), description: 'Dibuat dari pemutar musik' }),
      });

      if (createRes.success && createRes.data) {
        const createdPlaylist: IPlaylist = createRes.data;
        setPlaylists([createdPlaylist, ...playlists]);
        setNewTitle('');
        setIsCreating(false);

        // Langsung tambahkan lagu ke playlist baru tersebut
        await handleAddToPlaylist(createdPlaylist);
      }
    } catch (err: any) {
      alert(err.message || 'Gagal membuat playlist baru');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#181818] border border-white/10 w-full max-w-md rounded-2xl p-6 shadow-2xl relative text-white flex flex-col max-h-[85vh]">
        {/* Header Modal */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-x-3 truncate">
            <ListMusic className="w-6 h-6 text-spotify-green shrink-0" />
            <div className="truncate">
              <h3 className="text-lg font-bold truncate">Tambah ke Playlist</h3>
              <p className="text-xs text-spotify-subtext truncate">{song.title} - {song.artist_name || 'Artis'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-spotify-subtext hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Pesan Singkat */}
        {statusMessage && (
          <div className="mt-3 py-1.5 px-3 rounded-lg bg-spotify-green/20 border border-spotify-green/30 text-spotify-green text-xs font-semibold flex items-center gap-2 animate-fade-in">
            <Check className="w-4 h-4" /> {statusMessage}
          </div>
        )}

        {/* Form Buat Playlist Baru */}
        <div className="py-4 border-b border-white/10">
          {!isCreating ? (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-full bg-white/10 hover:bg-white/20 text-sm font-semibold transition-colors"
            >
              <Plus className="w-4 h-4 text-spotify-green" /> Buat Playlist Baru
            </button>
          ) : (
            <form onSubmit={handleCreateAndAdd} className="space-y-3">
              <input
                type="text"
                placeholder="Nama playlist baru..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                autoFocus
                className="w-full bg-[#242424] text-white text-sm px-4 py-2.5 rounded-lg border border-white/20 focus:outline-none focus:border-spotify-green"
              />
              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-spotify-subtext hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim()}
                  className="px-4 py-1.5 rounded-lg bg-spotify-green text-black text-xs font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-40"
                >
                  Simpan & Tambahkan
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Daftar Playlist */}
        <div className="flex-1 overflow-y-auto py-3 space-y-1.5 scrollbar-thin scrollbar-thumb-white/20">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10 text-spotify-subtext gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-spotify-green" />
              <p className="text-xs">Memuat playlist Anda...</p>
            </div>
          ) : !user ? (
            <div className="text-center py-8 text-spotify-subtext text-xs">
              Silakan login terlebih dahulu untuk mengelola playlist pribadi Anda.
            </div>
          ) : playlists.length === 0 ? (
            <div className="text-center py-8 text-spotify-subtext text-xs">
              Anda belum memiliki playlist. Buat playlist baru di atas!
            </div>
          ) : (
            playlists.map((p) => {
              const isAdded = addedPlaylistIds.has(p.id);
              return (
                <div
                  key={p.id}
                  onClick={() => handleAddToPlaylist(p)}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                    isAdded
                      ? 'bg-spotify-green/10 border border-spotify-green/40'
                      : 'hover:bg-white/10 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <img
                      src={p.cover_url || 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=100'}
                      alt={p.title}
                      className="w-10 h-10 rounded-md object-cover shrink-0"
                    />
                    <div className="truncate">
                      <p className="text-sm font-semibold truncate text-white">{p.title}</p>
                      <p className="text-xs text-spotify-subtext">{p.song_count || 0} lagu</p>
                    </div>
                  </div>

                  <button
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-transform ${
                      isAdded
                        ? 'bg-spotify-green text-black scale-105'
                        : 'bg-white/10 text-white hover:scale-105'
                    }`}
                  >
                    {isAdded ? <Check className="w-4 h-4 stroke-[3]" /> : <Plus className="w-4 h-4" />}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
