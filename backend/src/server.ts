import { createApp } from './app';
import { ENV } from './config/env';
import { checkDatabaseConnection } from './config/database';
import { runSeed } from './scripts/seed';

async function bootstrap() {
  console.log('🚀 Memulai Spotify Lite Backend Service...');

  // 1. Periksa koneksi Database
  await checkDatabaseConnection();

  // 2. Jalankan Seeding Awal (Audio, Artis, Album, Akun Admin)
  await runSeed();

  // 3. Inisialisasi Express Server
  const app = createApp();
  const server = app.listen(ENV.PORT, () => {
    console.log(`=======================================================`);
    console.log(`🎵 SPOTIFY LITE API SERVER BERJALAN`);
    console.log(`📡 URL API: http://localhost:${ENV.PORT}/api/v1`);
    console.log(`🩺 Health Check: http://localhost:${ENV.PORT}/health`);
    console.log(`👤 Akun Demo Pengguna: user@spotifylite.com / user123`);
    console.log(`🛡️ Akun Demo Admin:    admin@spotifylite.com / admin123`);
    console.log(`=======================================================`);
  });

  // Graceful Shutdown
  const handleExit = () => {
    console.log('\n🛑 Mematikan server secara aman...');
    server.close(() => {
      console.log('Server ditutup.');
      process.exit(0);
    });
  };

  process.on('SIGINT', handleExit);
  process.on('SIGTERM', handleExit);
}

bootstrap().catch(err => {
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
