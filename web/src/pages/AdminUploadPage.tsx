import React, { useState, useEffect } from 'react';
import { Upload, Music, Image, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import { apiRequest } from '../services/api';
import { IArtist, IAlbum } from '../types';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const AdminUploadPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [artistId, setArtistId] = useState('');
  const [albumId, setAlbumId] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const [artists, setArtists] = useState<IArtist[]>([]);
  const [albums, setAlbums] = useState<IAlbum[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal buat artis baru
  const [isArtistModal, setIsArtistModal] = useState(false);
  const [newArtistName, setNewArtistName] = useState('');
  const [newArtistBio, setNewArtistBio] = useState('');

  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/');
      return;
    }

    const loadMeta = async () => {
      try {
        const [aRes, albRes] = await Promise.all([
          apiRequest('/artists'),
          apiRequest('/albums'),
        ]);
        if (aRes.success) setArtists(aRes.data);
        if (albRes.success) setAlbums(albRes.data);
      } catch (e) {
        console.error('Gagal memuat artis & album:', e);
      }
    };
    loadMeta();
  }, [user]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!audioFile) {
      setMessage({ type: 'error', text: 'Pilih berkas audio terlebih dahulu.' });
      return;
    }
    if (!title.trim() || !artistId) {
      setMessage({ type: 'error', text: 'Judul dan artis wajib diisi.' });
      return;
    }

    setIsUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('audio', audioFile);
      if (coverFile) formData.append('cover', coverFile);
      formData.append('title', title.trim());
      formData.append('artist_id', artistId);
      if (albumId) formData.append('album_id', albumId);
      if (lyrics.trim()) formData.append('lyrics', lyrics.trim());

      const res = await apiRequest('/admin/upload/song', {
        method: 'POST',
        body: formData,
      });

      if (res.success) {
        setMessage({ type: 'success', text: `Lagu "${title}" berhasil diunggah dan siap dialirkan!` });
        setTitle('');
        setLyrics('');
        setAudioFile(null);
        setCoverFile(null);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Gagal mengunggah berkas.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateArtist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArtistName.trim()) return;

    try {
      const res = await apiRequest('/admin/artists', {
        method: 'POST',
        body: JSON.stringify({ name: newArtistName.trim(), bio: newArtistBio.trim() }),
      });
      if (res.success) {
        setArtists([...artists, res.data]);
        setArtistId(res.data.id);
        setIsArtistModal(false);
        setNewArtistName('');
        setNewArtistBio('');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto pb-24">
      <Navbar />

      <main className="max-w-3xl mx-auto px-8 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Panel Admin: Unggah Musik</h1>
          <p className="text-sm text-spotify-subtext mt-1">
            Unggah lagu bebas royalti (MP3/WAV/AAC) ke sistem untuk langsung dapat diputar di Web dan Mobile.
          </p>
        </div>

        {message && (
          <div
            className={`p-4 rounded-xl flex items-center gap-3 text-sm ${
              message.type === 'success'
                ? 'bg-spotify-green/20 text-spotify-green border border-spotify-green/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}
          >
            {message.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleUpload} className="space-y-6 bg-spotify-surface p-6 rounded-2xl border border-white/5">
          {/* File Audio Picker */}
          <div>
            <label className="block text-xs font-bold uppercase text-spotify-subtext mb-2">
              Berkas Audio (Wajib)
            </label>
            <div className="relative border-2 border-dashed border-white/10 hover:border-spotify-green/50 rounded-xl p-6 text-center transition-colors cursor-pointer bg-black/20">
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                className="absolute inset-0 opacity-0 cursor-pointer"
                required
              />
              <Music className="w-8 h-8 text-spotify-green mx-auto mb-2" />
              <p className="text-sm font-semibold text-white">
                {audioFile ? audioFile.name : 'Klik atau seret berkas audio (.mp3, .wav, .m4a)'}
              </p>
              <p className="text-xs text-spotify-subtext mt-1">Ukuran maksimal 30 MB</p>
            </div>
          </div>

          {/* Cover Image Picker */}
          <div>
            <label className="block text-xs font-bold uppercase text-spotify-subtext mb-2">
              Gambar Sampul (Opsional)
            </label>
            <div className="relative border-2 border-dashed border-white/10 hover:border-spotify-green/50 rounded-xl p-4 text-center transition-colors cursor-pointer bg-black/20">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Image className="w-6 h-6 text-spotify-subtext mx-auto mb-1" />
              <p className="text-xs font-semibold text-white">
                {coverFile ? coverFile.name : 'Pilih gambar cover album (JPG, PNG, WebP)'}
              </p>
            </div>
          </div>

          {/* Form Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-spotify-subtext">Judul Lagu</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Judul lagu..."
                className="w-full mt-1 bg-[#242424] text-white text-sm px-4 py-2.5 rounded-lg border border-white/10 focus:border-spotify-green focus:outline-none"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-spotify-subtext">Artis</label>
                <button
                  type="button"
                  onClick={() => setIsArtistModal(true)}
                  className="text-[11px] text-spotify-green hover:underline flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" /> Tambah Baru
                </button>
              </div>
              <select
                value={artistId}
                onChange={(e) => setArtistId(e.target.value)}
                className="w-full mt-1 bg-[#242424] text-white text-sm px-4 py-2.5 rounded-lg border border-white/10 focus:border-spotify-green focus:outline-none"
                required
              >
                <option value="">-- Pilih Artis --</option>
                {artists.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-spotify-subtext">Album (Opsional)</label>
            <select
              value={albumId}
              onChange={(e) => setAlbumId(e.target.value)}
              className="w-full mt-1 bg-[#242424] text-white text-sm px-4 py-2.5 rounded-lg border border-white/10 focus:border-spotify-green focus:outline-none"
            >
              <option value="">-- Tanpa Album / Single --</option>
              {albums.map((alb) => (
                <option key={alb.id} value={alb.id}>
                  {alb.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-spotify-subtext">Lirik Lagu (Opsional)</label>
            <textarea
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              placeholder="Masukkan teks lirik lagu di sini..."
              className="w-full mt-1 bg-[#242424] text-white text-sm px-4 py-2.5 rounded-lg border border-white/10 focus:border-spotify-green focus:outline-none h-28 resize-none font-mono text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={isUploading}
            className="w-full py-3 rounded-full bg-spotify-green text-black font-extrabold text-sm hover:scale-102 active:scale-98 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <span>Mengunggah & Memproses Audio...</span>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Unggah Lagu Sekarang</span>
              </>
            )}
          </button>
        </form>
      </main>

      {/* Modal Tambah Artis Cepat */}
      {isArtistModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateArtist}
            className="w-full max-w-sm bg-[#242424] rounded-2xl p-6 border border-white/10 space-y-4 shadow-2xl"
          >
            <h3 className="text-lg font-bold text-white">Tambah Artis Baru</h3>
            <div>
              <label className="text-xs text-spotify-subtext">Nama Artis</label>
              <input
                type="text"
                value={newArtistName}
                onChange={(e) => setNewArtistName(e.target.value)}
                placeholder="Nama band / artis..."
                className="w-full mt-1 bg-[#181818] text-white text-sm px-4 py-2 rounded-lg border border-white/10 focus:border-spotify-green focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="text-xs text-spotify-subtext">Biografi Singkat</label>
              <textarea
                value={newArtistBio}
                onChange={(e) => setNewArtistBio(e.target.value)}
                placeholder="Biografi..."
                className="w-full mt-1 bg-[#181818] text-white text-sm px-4 py-2 rounded-lg border border-white/10 focus:border-spotify-green focus:outline-none h-20 resize-none text-xs"
              />
            </div>
            <div className="flex justify-end gap-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsArtistModal(false)}
                className="px-4 py-1.5 rounded-full text-xs text-white hover:bg-white/10"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-1.5 rounded-full bg-spotify-green text-black font-bold text-xs"
              >
                Simpan
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
