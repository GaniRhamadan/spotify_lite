#!/usr/bin/env bash

# Spotify Lite - Public Internet Tunnel (Akses dari Mana Saja via Kuota 4G/5G)

echo "=========================================================="
echo "🌐 Menghubungkan Spotify Lite ke Internet Publik..."
echo "=========================================================="

CLOUDFLARED_BIN="/home/gani/.local/bin/cloudflared"

if [ ! -f "$CLOUDFLARED_BIN" ]; then
  echo "Mengunduh cloudflared binary..."
  curl -sL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o "$CLOUDFLARED_BIN"
  chmod +x "$CLOUDFLARED_BIN"
fi

# Pastikan backend berjalan
if ! curl -s http://127.0.0.1:5000/api/v1/songs &> /dev/null; then
  echo "⚠️ Backend belum menyala! Memulai backend..."
  cd /home/gani/spotify_lite/backend && npm run dev &
  sleep 4
fi

LOG_FILE="/tmp/spotify_tunnel.log"
rm -f "$LOG_FILE"

echo "⚡ Membuka secure tunnel Cloudflare ke http://127.0.0.1:5000..."
"$CLOUDFLARED_BIN" tunnel --url http://127.0.0.1:5000 > "$LOG_FILE" 2>&1 &
TUNNEL_PID=$!

trap "kill $TUNNEL_PID 2>/dev/null; exit 0" INT TERM EXIT

# Menunggu URL publik dari Cloudflare
echo "⏳ Mengambil alamat domain publik gratis..."
PUBLIC_URL=""
for i in {1..20}; do
  PUBLIC_URL=$(grep -o 'https://[a-zA-Z0-9-]*\.trycloudflare\.com' "$LOG_FILE" | head -n 1)
  if [ -n "$PUBLIC_URL" ]; then
    break
  fi
  sleep 1
done

if [ -n "$PUBLIC_URL" ]; then
  echo ""
  echo "=========================================================="
  echo "🎉 SERVER SPOTIFY LITE ANDA KINI ONLINE DI INTERNET!"
  echo "=========================================================="
  echo "🔗 URL Domain Publik : $PUBLIC_URL"
  echo "📲 URL API untuk HP   : $PUBLIC_URL/api/v1"
  echo "=========================================================="
  echo ""
  echo "👉 Cara Pakai di HP (Bisa dari Jaringan Apapun / Kuota Data):"
  echo "1. Buka aplikasi 'Spotify Lite' di HP."
  echo "2. Masuk ke tab 'Pengaturan' (ikon gear kanan bawah)."
  echo "3. Sentuh 'Alamat Server API' -> pilih 'Atau Masukkan IP / URL Manual'."
  echo "4. Masukkan URL: $PUBLIC_URL/api/v1"
  echo "5. Simpan dan tekan 'Uji Tes Koneksi Server'!"
  echo ""
  echo "Tekan [Ctrl + C] untuk menghentikan tunnel."
  echo "=========================================================="
  wait $TUNNEL_PID
else
  echo "❌ Gagal mendapatkan URL publik Cloudflare. Silakan periksa log di $LOG_FILE"
fi
