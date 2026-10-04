import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Music2, Lock, Mail, User, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const [isRegister, setIsRegister] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        if (!name.trim()) throw new Error('Nama lengkap wajib diisi');
        await register(name.trim(), email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat otentikasi');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = (role: 'user' | 'admin') => {
    setIsRegister(false);
    if (role === 'admin') {
      setEmail('admin@spotifylite.com');
      setPassword('admin123');
    } else {
      setEmail('user@spotifylite.com');
      setPassword('user123');
    }
  };

  return (
    <div className="min-h-screen bg-spotify-base flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-black/80 border border-white/10 rounded-2xl p-8 backdrop-blur-xl shadow-2xl flex flex-col gap-y-6">
        {/* Logo & Judul */}
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 bg-spotify-green rounded-full flex items-center justify-center shadow-xl shadow-spotify-green/20 mb-3">
            <Music2 className="w-8 h-8 fill-black stroke-black" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            {isRegister ? 'Buat Akun Spotify Lite' : 'Masuk ke Spotify Lite'}
          </h1>
          <p className="text-xs text-spotify-subtext mt-1">
            Musik tanpa batas, ringan, hemat kuota dan RAM
          </p>
        </div>

        {/* Notifikasi Error */}
        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center gap-2 text-xs text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Login / Register */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="text-xs font-semibold text-spotify-subtext">Nama Lengkap</label>
              <div className="relative mt-1">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-spotify-subtext" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama Anda"
                  className="w-full bg-[#181818] text-white text-sm pl-10 pr-4 py-2.5 rounded-lg border border-white/10 focus:border-spotify-green focus:outline-none"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-spotify-subtext">Email</label>
            <div className="relative mt-1">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-spotify-subtext" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full bg-[#181818] text-white text-sm pl-10 pr-4 py-2.5 rounded-lg border border-white/10 focus:border-spotify-green focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-spotify-subtext">Kata Sandi</label>
            <div className="relative mt-1">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-spotify-subtext" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#181818] text-white text-sm pl-10 pr-4 py-2.5 rounded-lg border border-white/10 focus:border-spotify-green focus:outline-none"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full bg-spotify-green text-black font-extrabold text-sm hover:scale-102 active:scale-98 transition-all shadow-xl disabled:opacity-50 mt-2"
          >
            {loading ? 'Memproses...' : isRegister ? 'Daftar Sekarang' : 'Masuk'}
          </button>
        </form>

        {/* Tombol Isi Akun Demo Cepat */}
        <div className="pt-2 border-t border-white/10 text-center space-y-2">
          <p className="text-[11px] text-spotify-subtext font-medium">Uji Coba Cepat (Akun Demo):</p>
          <div className="flex gap-2 justify-center">
            <button
              type="button"
              onClick={() => fillDemoAccount('user')}
              className="px-3 py-1.5 rounded-md bg-[#222] text-xs font-semibold text-white hover:bg-[#333] transition-colors"
            >
              👤 Akun User
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('admin')}
              className="px-3 py-1.5 rounded-md bg-[#222] text-xs font-semibold text-spotify-green hover:bg-[#333] transition-colors"
            >
              🛡️ Akun Admin
            </button>
          </div>
        </div>

        {/* Switch Login / Register */}
        <div className="text-center text-xs text-spotify-subtext">
          {isRegister ? 'Sudah memiliki akun? ' : 'Belum memiliki akun? '}
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            className="font-bold text-white hover:underline ml-1"
          >
            {isRegister ? 'Masuk di sini' : 'Daftar sekarang'}
          </button>
        </div>
      </div>
    </div>
  );
};
