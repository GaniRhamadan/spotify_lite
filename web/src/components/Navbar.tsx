import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Smartphone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDownload } from '../context/DownloadContext';

interface NavbarProps {
  children?: React.ReactNode;
}

export const Navbar: React.FC<NavbarProps> = ({ children }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openDownloadModal } = useDownload();

  return (
    <header className="h-16 px-8 flex items-center justify-between bg-spotify-base/80 backdrop-blur-md sticky top-0 z-30 border-b border-[#222]/50">
      <div className="flex items-center gap-x-4">
        {/* Tombol Back & Forward Browser */}
        <div className="flex items-center gap-x-2">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full bg-black/60 hover:bg-black flex items-center justify-center text-spotify-subtext hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate(1)}
            className="w-8 h-8 rounded-full bg-black/60 hover:bg-black flex items-center justify-center text-spotify-subtext hover:text-white transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Slot dinamis (misal Search Input) */}
        {children}
      </div>

      <div className="flex items-center gap-x-3">
        {/* Tombol Unduh App Mobile */}
        <button
          onClick={openDownloadModal}
          className="flex items-center gap-x-2 px-3.5 py-1.5 rounded-full bg-spotify-green/10 hover:bg-spotify-green/20 text-spotify-green border border-spotify-green/30 hover:border-spotify-green text-xs font-semibold transition-all hover:scale-105 active:scale-95 shadow-sm"
          title="Unduh Spotify Lite untuk HP Android (APK)"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Install App HP</span>
          <span className="sm:hidden">APK</span>
        </button>

        {user ? (
          <div className="flex items-center gap-x-2 bg-black/60 px-3 py-1.5 rounded-full border border-white/10 hover:border-white/20 transition-all cursor-pointer">
            <div className="w-6 h-6 rounded-full bg-spotify-green flex items-center justify-center text-black text-xs font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-medium text-white">{user.name}</span>
          </div>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="px-5 py-2 rounded-full bg-white text-black font-semibold text-xs tracking-wide hover:scale-105 active:scale-95 transition-all"
          >
            Masuk
          </button>
        )}
      </div>
    </header>
  );
};
