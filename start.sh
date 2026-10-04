#!/usr/bin/env bash

# Spotify Lite - Quick Start Script

echo "============================================"
echo "🎵 Spotify Lite - Menjalankan Semua Layanan"
echo "============================================"

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL_IP="192.168.1.20"

# 1. Menghubungkan Port USB Android (Jika HP Tercolok)
if command -v adb &> /dev/null; then
  DEVICE=$(adb devices | grep -w "device" | awk '{print $1}' | head -n 1)
  if [ -n "$DEVICE" ]; then
    echo "📱 Terdeteksi perangkat Android: $DEVICE"
    adb reverse tcp:5000 tcp:5000
    echo "✅ Port forwarding aktif: HP dapat mengakses http://127.0.0.1:5000/api/v1"
  fi
fi

# 2. Menjalankan Backend (Port 5000)
echo ""
echo "🚀 Memeriksa Backend (Port 5000)..."
if curl -s http://127.0.0.1:5000/api/v1/songs &> /dev/null; then
  echo "✅ Backend sudah berjalan di port 5000."
else
  echo "⚡ Memulai Backend dev server..."
  cd "$PROJECT_DIR/backend" && npm run dev &
fi

# 3. Menjalankan Web Player (Port 3000)
echo ""
echo "🌐 Memeriksa Web Player (Port 3000)..."
if curl -s http://127.0.0.1:3000 &> /dev/null; then
  echo "✅ Web Player sudah berjalan di port 3000."
else
  echo "⚡ Memulai Web Player dev server..."
  cd "$PROJECT_DIR/web" && npm run dev &
fi

echo ""
echo "============================================"
echo "🎉 Spotify Lite Siap Digunakan!"
echo "============================================"
echo "💻 Web Player (Laptop):    http://localhost:3000"
echo "🌐 Web Player (Jaringan):  http://$LOCAL_IP:3000"
echo "🔌 API Backend:            http://127.0.0.1:5000/api/v1"
echo "📡 API Backend (Wi-Fi):    http://$LOCAL_IP:5000/api/v1"
echo "📱 Mobile App: Buka aplikasi 'Spotify Lite' di ponsel Android Anda."
echo "============================================"
