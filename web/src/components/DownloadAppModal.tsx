import React, { useState } from 'react';
import { X, Download, Smartphone, QrCode, CheckCircle2, ShieldCheck, Zap, WifiOff, Copy, Check } from 'lucide-react';
import { useDownload } from '../context/DownloadContext';

export const DownloadAppModal: React.FC = () => {
  const { isModalOpen, closeDownloadModal, downloadUrl } = useDownload();
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  if (!isModalOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(downloadUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    downloadUrl
  )}&bgcolor=181818&color=1db954&margin=2`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-[#141414] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ambient Glow */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-spotify-green/20 via-spotify-green/5 to-transparent pointer-events-none" />

        {/* Header Bar */}
        <div className="relative flex items-center justify-between p-6 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-spotify-green to-emerald-400 flex items-center justify-center shadow-lg shadow-spotify-green/30 text-black">
              <Smartphone className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">Spotify Lite Mobile</h3>
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-spotify-green/20 text-spotify-green border border-spotify-green/30 rounded-full">
                  Android APK
                </span>
              </div>
              <p className="text-xs text-spotify-subtext mt-0.5">Versi Release 1.0.0 • Ringan & Super Cepat (~55 MB)</p>
            </div>
          </div>
          <button
            onClick={closeDownloadModal}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-spotify-subtext hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {/* Fitur Utama */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-[#1b1b1b] p-3 rounded-xl border border-white/5 flex flex-col items-center text-center">
              <Zap className="w-5 h-5 text-spotify-green mb-1.5" />
              <span className="text-[11px] font-semibold text-white">Hemat Kuota</span>
              <span className="text-[10px] text-spotify-subtext">AAC 128kbps hemat data</span>
            </div>
            <div className="bg-[#1b1b1b] p-3 rounded-xl border border-white/5 flex flex-col items-center text-center">
              <WifiOff className="w-5 h-5 text-blue-400 mb-1.5" />
              <span className="text-[11px] font-semibold text-white">Mode Offline</span>
              <span className="text-[10px] text-spotify-subtext">Unduh & putar tanpa internet</span>
            </div>
            <div className="bg-[#1b1b1b] p-3 rounded-xl border border-white/5 flex flex-col items-center text-center">
              <ShieldCheck className="w-5 h-5 text-emerald-400 mb-1.5" />
              <span className="text-[11px] font-semibold text-white">Bebas Iklan</span>
              <span className="text-[10px] text-spotify-subtext">Musik tanpa jeda interupsi</span>
            </div>
          </div>

          {/* Tombol Aksi Utama */}
          <div className="flex flex-col gap-2.5">
            <a
              href={downloadUrl}
              download="SpotifyLite-Release.apk"
              className="w-full py-3.5 px-4 bg-spotify-green hover:bg-[#1ed760] text-black font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-spotify-green/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>Unduh Berkas APK Sekarang (55 MB)</span>
            </a>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowQr(!showQr)}
                className="flex-1 py-2.5 px-3 bg-[#202020] hover:bg-[#282828] text-white text-xs font-semibold rounded-xl border border-white/5 flex items-center justify-center gap-2 transition-all"
              >
                <QrCode className="w-4 h-4 text-spotify-green" />
                <span>{showQr ? 'Sembunyikan QR Code' : 'Scan QR di HP'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className="py-2.5 px-3 bg-[#202020] hover:bg-[#282828] text-spotify-subtext hover:text-white text-xs font-semibold rounded-xl border border-white/5 flex items-center justify-center gap-1.5 transition-all"
                title="Salin Link Download"
              >
                {copied ? <Check className="w-4 h-4 text-spotify-green" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Tersalin!' : 'Salin Tautan'}</span>
              </button>
            </div>
          </div>

          {/* QR Code Section (Expandable) */}
          {showQr && (
            <div className="bg-[#1b1b1b] p-4 rounded-xl border border-white/10 flex flex-col items-center text-center animate-in fade-in duration-200">
              <div className="p-2 bg-[#181818] rounded-xl border border-spotify-green/30 shadow-md mb-2">
                <img
                  src={qrImageUrl}
                  alt="QR Code Download APK"
                  className="w-40 h-40 rounded-lg object-contain"
                  onError={(e) => {
                    // Fallback jika API QR gagal
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <p className="text-xs font-medium text-white">Scan langsung menggunakan kamera HP</p>
              <p className="text-[11px] text-spotify-subtext mt-0.5">
                Buka aplikasi Kamera atau Google Lens di HP Anda untuk mengunduh APK secara langsung.
              </p>
            </div>
          )}

          {/* Panduan Instalasi 3 Langkah */}
          <div className="bg-[#181818] p-4 rounded-xl border border-white/5 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-spotify-green" />
              <span>Cara Pasang di HP Android</span>
            </h4>
            <ol className="text-xs text-spotify-subtext space-y-2 list-decimal list-inside leading-relaxed">
              <li>
                <span className="text-white font-medium">Unduh berkas APK</span> menggunakan tombol unduh atau scan QR code di atas.
              </li>
              <li>
                Buka berkas <span className="text-spotify-green font-medium">SpotifyLite-Release.apk</span> di folder Downloads HP Anda.
              </li>
              <li>
                Jika muncul peringatan keamanan, pilih <span className="text-white font-medium">"Izinkan dari sumber ini"</span> atau <span className="text-white font-medium">"Tetap Install"</span>, lalu selesai!
              </li>
            </ol>
          </div>
        </div>

        {/* Footer Note */}
        <div className="p-4 bg-[#101010] border-t border-white/5 text-center text-[11px] text-spotify-subtext">
          Membutuhkan Android 7.0 (Nougat) ke atas • Terhubung ke server VPS online 24 jam.
        </div>
      </div>
    </div>
  );
};
