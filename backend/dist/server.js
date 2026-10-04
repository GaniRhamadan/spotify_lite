"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const env_1 = require("./config/env");
const database_1 = require("./config/database");
const seed_1 = require("./scripts/seed");
async function bootstrap() {
    console.log('🚀 Memulai Spotify Lite Backend Service...');
    // 1. Periksa koneksi Database
    await (0, database_1.checkDatabaseConnection)();
    // 2. Jalankan Seeding Awal (Audio, Artis, Album, Akun Admin)
    await (0, seed_1.runSeed)();
    // 3. Inisialisasi Express Server
    const app = (0, app_1.createApp)();
    const server = app.listen(env_1.ENV.PORT, () => {
        console.log(`=======================================================`);
        console.log(`🎵 SPOTIFY LITE API SERVER BERJALAN`);
        console.log(`📡 URL API: http://localhost:${env_1.ENV.PORT}/api/v1`);
        console.log(`🩺 Health Check: http://localhost:${env_1.ENV.PORT}/health`);
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
