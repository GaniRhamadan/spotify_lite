import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Search, Library, PlusSquare, Heart, Upload, LogOut, Music2, Smartphone, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDownload } from '../context/DownloadContext';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const { openDownloadModal } = useDownload();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-[#121212] rounded-lg flex flex-col justify-between p-5 h-full select-none border border-white/5 shrink-0">
      <div className="flex flex-col gap-y-6">
        {/* Logo Spotify Lite */}
        <div className="flex items-center gap-x-2 px-2 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-9 h-9 bg-spotify-green rounded-full flex items-center justify-center text-black font-extrabold shadow-lg shadow-spotify-green/20">
            <Music2 className="w-5 h-5 fill-black stroke-black" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1">
              Spotify <span className="text-xs bg-spotify-green/20 text-spotify-green font-semibold px-1.5 py-0.5 rounded">Lite</span>
            </span>
          </div>
        </div>

        {/* Menu Navigasi Utama */}
        <nav className="flex flex-col gap-y-1">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex items-center gap-x-4 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors duration-200 ${
                isActive ? 'bg-[#282828] text-white' : 'text-spotify-subtext hover:text-white'
              }`
            }
          >
            <Home className="w-5 h-5" />
            <span>Beranda</span>
          </NavLink>

          <NavLink
            to="/search"
            className={({ isActive }) =>
              `flex items-center gap-x-4 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors duration-200 ${
                isActive ? 'bg-[#282828] text-white' : 'text-spotify-subtext hover:text-white'
              }`
            }
          >
            <Search className="w-5 h-5" />
            <span>Cari</span>
          </NavLink>

          <NavLink
            to="/library"
            className={({ isActive }) =>
              `flex items-center gap-x-4 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors duration-200 ${
                isActive ? 'bg-[#282828] text-white' : 'text-spotify-subtext hover:text-white'
              }`
            }
          >
            <Library className="w-5 h-5" />
            <span>Koleksi Kamu</span>
          </NavLink>
        </nav>

        {/* Koleksi & Playlist */}
        <div className="pt-4 border-t border-[#222] flex flex-col gap-y-1">
          <NavLink
            to="/library?tab=liked"
            className={({ isActive }) =>
              `flex items-center gap-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'text-white' : 'text-spotify-subtext hover:text-white'
              }`
            }
          >
            <div className="w-7 h-7 rounded bg-gradient-to-br from-indigo-600 to-blue-300 flex items-center justify-center">
              <Heart className="w-4 h-4 fill-white stroke-none" />
            </div>
            <span>Lagu yang Disukai</span>
          </NavLink>

          {user?.role === 'admin' && (
            <NavLink
              to="/admin/upload"
              className={({ isActive }) =>
                `flex items-center gap-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'text-spotify-green' : 'text-spotify-subtext hover:text-white'
                }`
              }
            >
              <div className="w-7 h-7 rounded bg-spotify-green/20 text-spotify-green flex items-center justify-center">
                <Upload className="w-4 h-4" />
              </div>
              <span>Upload Musik (Admin)</span>
            </NavLink>
          )}
        </div>

        {/* Promo Download App Android */}
        <div className="p-3.5 rounded-xl bg-gradient-to-b from-[#1b1b1b] to-[#121212] border border-white/5 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-spotify-green" />
              Spotify Lite App
            </span>
            <span className="text-[9px] bg-spotify-green/20 text-spotify-green font-bold px-1.5 py-0.5 rounded">
              APK 55MB
            </span>
          </div>
          <p className="text-[11px] text-spotify-subtext leading-snug mb-2.5">
            Dengar musik di HP lebih ringan, cepat, & hemat kuota.
          </p>
          <button
            onClick={openDownloadModal}
            className="w-full py-1.5 px-3 rounded-lg bg-white/10 hover:bg-spotify-green hover:text-black text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh Aplikasi</span>
          </button>
        </div>
      </div>

      {/* Profil Pengguna Bawah */}
      <div className="pt-4 border-t border-[#222]">
        {user ? (
          <div className="flex items-center justify-between p-2 rounded-lg bg-[#181818]">
            <div className="flex items-center gap-x-3 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-spotify-border flex items-center justify-center text-xs font-bold uppercase text-spotify-green">
                {user.name.charAt(0)}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                <p className="text-[10px] text-spotify-subtext truncate">{user.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Keluar"
              className="text-spotify-subtext hover:text-red-400 p-1.5 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="w-full py-2.5 rounded-full bg-white text-black font-semibold text-sm hover:scale-105 active:scale-95 transition-all shadow-md"
          >
            Masuk / Daftar
          </button>
        )}
      </div>
    </aside>
  );
};
