#!/bin/bash
# ========================================================
# Script Installer & Runner Spotify Lite Backend di Termux
# ========================================================

echo "🎵 Mempersiapkan Spotify Lite Backend di HP (Termux)..."

# 1. Update paket dan install dependensi sistem jika belum ada
echo "📦 Memeriksa dependensi: Node.js, Python, FFmpeg, Git..."
pkg update -y
pkg install -y nodejs-lts python ffmpeg git curl

# 2. Install / Update yt-dlp via pip (agar streaming YouTube selalu lancar)
echo "📥 Memasang yt-dlp terbaru..."
pip install --upgrade yt-dlp

# 3. Masuk ke folder backend
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR/backend" || exit 1

# 4. Install dependensi Node.js jika belum
if [ ! -d "node_modules" ]; then
  echo "📦 Memasang dependensi Node.js..."
  npm install
fi

# 5. Build TypeScript ke JavaScript
if [ ! -f "dist/server.js" ]; then
  echo "⚙️ Melakukan build backend..."
  npm run build
fi

# Buat folder penyimpanan jika belum ada
mkdir -p storage/audio storage/covers

echo ""
echo "=========================================================="
echo "🎉 SPOTIFY LITE BACKEND BERHASIL AKTIF DI HP ANDA!"
echo "=========================================================="
echo "📡 URL SERVER DI APLIKASI: http://127.0.0.1:5000/api/v1"
echo "💡 Tips: Tarik notifikasi Termux lalu pilih 'Acquire WakeLock'"
echo "         agar musik tidak berhenti saat layar HP mati."
echo "=========================================================="
echo ""

# Jalankan server
node dist/server.js
