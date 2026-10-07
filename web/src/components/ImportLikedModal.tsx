import React, { useState } from 'react';
import { X, Sparkles, Link2, FileUp, ListPlus, Loader2, Check, Music } from 'lucide-react';
import { apiRequest } from '../services/api';
import { ISong } from '../types';

interface ImportLikedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ImportLikedModal: React.FC<ImportLikedModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState<'url' | 'file' | 'text'>('url');
  const [playlistUrl, setPlaylistUrl] = useState<string>('');
  const [rawText, setRawText] = useState<string>('');
  const [parsedTracks, setParsedTracks] = useState<Array<{ title: string; artist?: string }>>([]);
  const [fileName, setFileName] = useState<string>('');
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [previewSongs, setPreviewSongs] = useState<ISong[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        if (file.name.endsWith('.json')) {
          const json = JSON.parse(content);
          let extracted: Array<{ title: string; artist?: string }> = [];

          if (Array.isArray(json)) {
            extracted = json.map((item: any) => ({
              title: item.title || item.name || item.track?.name || 'Unknown Track',
              artist: item.artist || item.artist_name || item.track?.artists?.[0]?.name || '',
            }));
          } else if (json.tracks && Array.isArray(json.tracks)) {
            extracted = json.tracks.map((item: any) => ({
              title: item.title || item.name || item.track?.name || 'Unknown Track',
              artist: item.artist || item.artist_name || item.track?.artists?.[0]?.name || '',
            }));
          }

          if (extracted.length === 0) {
            throw new Error('Tidak menemukan format daftar lagu yang dikenali pada berkas JSON.');
          }
          setParsedTracks(extracted);
        } else {
          // Format CSV atau TXT
          const lines = content.split('\n').map((l) => l.trim()).filter(Boolean);
          const tracks: Array<{ title: string; artist?: string }> = [];

          for (const line of lines) {
            if (line.toLowerCase().includes('track name') || line.toLowerCase().includes('artist name')) {
              continue; // Skip CSV header
            }
            if (line.includes(',') || line.includes(';')) {
              const delimiter = line.includes(';') ? ';' : ',';
              const parts = line.split(delimiter).map((p) => p.replace(/^["']|["']$/g, '').trim());
              if (parts.length >= 2) {
                tracks.push({ title: parts[0], artist: parts[1] });
              } else if (parts[0]) {
                tracks.push({ title: parts[0] });
              }
            } else if (line.includes(' - ')) {
              const [artist, title] = line.split(' - ');
              tracks.push({ title: title.trim(), artist: artist.trim() });
            } else {
              tracks.push({ title: line });
            }
          }

          if (tracks.length === 0) {
            throw new Error('Tidak dapat menemukan data lagu di dalam file.');
          }
          setParsedTracks(tracks);
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Gagal membaca berkas.');
      }
    };
    reader.readAsText(file);
  };

  const handlePreview = async () => {
    setErrorMessage(null);
    setPreviewSongs([]);
    setSuccessCount(null);
    setIsLoading(true);

    try {
      let payload: any = { isPreview: true };

      if (activeTab === 'url') {
        if (!playlistUrl.trim()) {
          throw new Error('Silakan masukkan link playlist YouTube atau YouTube Music.');
        }
        payload.playlistUrl = playlistUrl.trim();
      } else if (activeTab === 'file') {
        if (parsedTracks.length === 0) {
          throw new Error('Silakan unggah berkas daftar lagu terlebih dahulu.');
        }
        payload.tracks = parsedTracks;
      } else if (activeTab === 'text') {
        if (!rawText.trim()) {
          throw new Error('Silakan tempel daftar lagu atau link YouTube.');
        }
        payload.rawText = rawText.trim();
      }

      const res = await apiRequest('/user/likes/import', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.success && Array.isArray(res.data)) {
        if (res.data.length === 0) {
          throw new Error('Tidak ada lagu yang berhasil ditemukan. Periksa kembali link atau data Anda.');
        }
        setPreviewSongs(res.data);
      } else {
        throw new Error(res.message || 'Gagal memuat pratinjau lagu.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat memproses lagu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToLikes = async () => {
    if (previewSongs.length === 0) return;
    setErrorMessage(null);
    setIsSaving(true);

    try {
      let payload: any = { isPreview: false };

      if (activeTab === 'url') {
        payload.playlistUrl = playlistUrl.trim();
      } else if (activeTab === 'file') {
        payload.tracks = parsedTracks;
      } else if (activeTab === 'text') {
        payload.rawText = rawText.trim();
      }

      const res = await apiRequest('/user/likes/import', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.success) {
        setSuccessCount(res.count || previewSongs.length);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1200);
      } else {
        throw new Error(res.message || 'Gagal menambahkan lagu ke koleksi disukai.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat menyimpan lagu.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-[#181818] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header Modal */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-spotify-green/20 flex items-center justify-center text-spotify-green">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Import Lagu ke Koleksi Disukai</h2>
              <p className="text-xs text-spotify-subtext">
                Masukkan playlist atau data lagu hasil transfer dari ekstensi Spotify ke YouTube
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-spotify-subtext hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Pilihan Sumber */}
        <div className="flex border-b border-white/10 px-6 pt-3 gap-2 bg-[#121212]">
          <button
            onClick={() => { setActiveTab('url'); setPreviewSongs([]); setErrorMessage(null); }}
            className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'url'
                ? 'border-spotify-green text-spotify-green'
                : 'border-transparent text-spotify-subtext hover:text-white'
            }`}
          >
            <Link2 className="w-4 h-4" />
            Link Spotify / YouTube
          </button>
          <button
            onClick={() => { setActiveTab('file'); setPreviewSongs([]); setErrorMessage(null); }}
            className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'file'
                ? 'border-spotify-green text-spotify-green'
                : 'border-transparent text-spotify-subtext hover:text-white'
            }`}
          >
            <FileUp className="w-4 h-4" />
            File JSON / CSV
          </button>
          <button
            onClick={() => { setActiveTab('text'); setPreviewSongs([]); setErrorMessage(null); }}
            className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'text'
                ? 'border-spotify-green text-spotify-green'
                : 'border-transparent text-spotify-subtext hover:text-white'
            }`}
          >
            <ListPlus className="w-4 h-4" />
            Tempel Teks Lagu
          </button>
        </div>

        {/* Isi Konten Input */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {errorMessage && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 whitespace-pre-line leading-relaxed">
              {errorMessage}
            </div>
          )}

          {successCount !== null && (
            <div className="p-4 bg-spotify-green/20 border border-spotify-green/40 rounded-xl flex items-center gap-3 text-spotify-green">
              <Check className="w-5 h-5" />
              <span className="text-sm font-semibold">
                Sukses! Berhasil menambahkan {successCount} lagu ke Lagu yang Disukai.
              </span>
            </div>
          )}

          {/* Tab 1: Input URL Playlist Spotify / YouTube */}
          {activeTab === 'url' && (
            <div className="space-y-3">
              <label className="text-xs font-semibold text-spotify-subtext block">
                Link Playlist / Album Spotify atau YouTube Playlist
              </label>
              <input
                type="text"
                placeholder="Contoh: https://open.spotify.com/playlist/... atau https://www.youtube.com/playlist?list=..."
                value={playlistUrl}
                onChange={(e) => setPlaylistUrl(e.target.value)}
                className="w-full px-4 py-3 bg-[#242424] border border-white/10 rounded-xl text-white text-sm placeholder:text-spotify-subtext/60 focus:outline-none focus:border-spotify-green transition-colors font-mono text-xs"
              />

              {playlistUrl.includes('collection/tracks') && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2.5 text-xs text-amber-200 animate-fadeIn">
                  <div className="flex items-center gap-2 font-bold text-amber-400">
                    <span>⚠️ Link Privat Akun Spotify Terdeteksi</span>
                  </div>
                  <p className="leading-relaxed">
                    Link <code className="bg-black/40 px-1 py-0.5 rounded text-amber-100 font-mono">collection/tracks</code> adalah halaman privat akun Anda di Spotify (tidak dapat dibuka oleh server tanpa login).
                  </p>
                  <div className="bg-black/30 p-3 rounded-lg space-y-1.5 font-sans">
                    <p className="font-bold text-white text-xs">Cara Cepat 10 Detik di Spotify:</p>
                    <ol className="list-decimal list-inside space-y-1 text-spotify-subtext text-[11px] leading-relaxed">
                      <li>Buka Spotify di PC/Laptop, buka menu <strong>Liked Songs</strong>.</li>
                      <li>Tekan <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-white font-mono">Ctrl + A</kbd> (pilih semua lagu).</li>
                      <li>Klik Kanan &rarr; <strong>Add to other playlist</strong> &rarr; <strong>New playlist</strong>.</li>
                      <li>Klik Kanan playlist baru &rarr; <strong>Share</strong> &rarr; <strong>Copy link to playlist</strong>.</li>
                      <li>Tempel link playlist Spotify tersebut (<code className="text-white">open.spotify.com/playlist/...</code>) di sini!</li>
                    </ol>
                  </div>
                  <p className="text-[11px] text-amber-300">
                    💡 <em>Atau jika ekstensi Anda sudah mentransfernya ke YouTube, tempel link <strong>YouTube Playlist</strong> hasil transfer ekstensi Anda.</em>
                  </p>
                </div>
              )}

              <p className="text-[11px] text-spotify-subtext leading-relaxed">
                💡 <strong className="text-white">Mendukung:</strong> Link Playlist Spotify (<code className="text-white">open.spotify.com/playlist/...</code>), Album Spotify, atau YouTube Playlist (<code className="text-white">youtube.com/playlist?list=...</code>).
              </p>
            </div>
          )}

          {/* Tab 2: Upload File */}
          {activeTab === 'file' && (
            <div className="space-y-3">
              <label className="text-xs font-semibold text-spotify-subtext block">
                Unggah Berkas Ekspor (.json, .csv, atau .txt)
              </label>
              <div className="border-2 border-dashed border-white/15 hover:border-spotify-green/60 rounded-xl p-6 text-center transition-colors bg-[#242424]/40 cursor-pointer relative">
                <input
                  type="file"
                  accept=".json,.csv,.txt"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <FileUp className="w-8 h-8 text-spotify-subtext mx-auto mb-2" />
                <p className="text-sm font-semibold text-white">
                  {fileName ? fileName : 'Klik atau seret file ke sini'}
                </p>
                <p className="text-xs text-spotify-subtext mt-1">
                  Mendukung file export dari TuneMyMusic, Soundiiz, Spotlist, Exportify, dll.
                </p>
              </div>
              {parsedTracks.length > 0 && (
                <div className="text-xs text-spotify-green font-medium">
                  ✓ Terdeteksi {parsedTracks.length} judul lagu siap diproses.
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Tempel Teks */}
          {activeTab === 'text' && (
            <div className="space-y-3">
              <label className="text-xs font-semibold text-spotify-subtext block">
                Tempel Daftar Lagu atau Link YouTube (1 baris per lagu)
              </label>
              <textarea
                rows={6}
                placeholder="Contoh:&#10;Coldplay - Yellow&#10;Bernadya - Satu Bulan&#10;https://www.youtube.com/watch?v=...&#10;Sheila on 7 - Dan"
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                className="w-full px-4 py-3 bg-[#242424] border border-white/10 rounded-xl text-white text-sm placeholder:text-spotify-subtext/60 focus:outline-none focus:border-spotify-green transition-colors resize-none font-mono"
              />
            </div>
          )}

          {/* Tombol Ambil Pratinjau */}
          {previewSongs.length === 0 && (
            <div className="pt-2">
              <button
                type="button"
                onClick={handlePreview}
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-white text-black font-bold text-sm hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sedang Mengambil & Mencari Lagu...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-black" />
                    <span>Cari & Pratinjau Lagu</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Daftar Pratinjau Lagu Ditemukan */}
          {previewSongs.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">
                  Ditemukan {previewSongs.length} Lagu:
                </span>
                <span className="text-[11px] text-spotify-subtext">
                  Siap disimpan ke Lagu yang Disukai
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-white/5">
                {previewSongs.map((song, idx) => (
                  <div key={song.id || idx} className="flex items-center gap-3 py-1.5 px-2 rounded-lg bg-[#222]">
                    <img
                      src={song.cover_url || 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=80'}
                      alt={song.title}
                      className="w-8 h-8 rounded object-cover flex-shrink-0"
                    />
                    <div className="truncate flex-1">
                      <p className="text-xs font-semibold text-white truncate">{song.title}</p>
                      <p className="text-[10px] text-spotify-subtext truncate">{song.artist_name || 'Artis'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-6 border-t border-white/10 bg-[#121212] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full text-xs font-semibold text-spotify-subtext hover:text-white transition-colors"
          >
            Batal
          </button>

          {previewSongs.length > 0 ? (
            <button
              type="button"
              onClick={handleSaveToLikes}
              disabled={isSaving}
              className="px-6 py-2.5 rounded-full bg-spotify-green text-black font-bold text-sm hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan ke Favorit...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Simpan Semua ({previewSongs.length} Lagu)</span>
                </>
              )}
            </button>
          ) : (
            <div className="text-[11px] text-spotify-subtext">
              Klik &quot;Cari &amp; Pratinjau Lagu&quot; untuk melihat daftar
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
