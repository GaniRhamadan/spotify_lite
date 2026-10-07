"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const env_1 = require("./config/env");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const song_routes_1 = __importDefault(require("./routes/song.routes"));
const playlist_routes_1 = __importDefault(require("./routes/playlist.routes"));
const search_routes_1 = __importDefault(require("./routes/search.routes"));
const artist_routes_1 = __importDefault(require("./routes/artist.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const error_middleware_1 = require("./middlewares/error.middleware");
const createApp = () => {
    const app = (0, express_1.default)();
    // Middleware Keamanan Helmet (dengan pengecualian header media stream agar bisa diputar lintas origin)
    app.use((0, helmet_1.default)({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    }));
    // CORS: Izinkan akses dari aplikasi Web dan Mobile
    app.use((0, cors_1.default)({
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Range'],
        exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length'],
    }));
    // Rate Limiting untuk perlindungan dari serangan DDoS / brute force
    const limiter = (0, express_rate_limit_1.default)({
        windowMs: 60 * 1000, // 1 menit
        max: 300, // maks 300 request per menit per IP
        message: { success: false, message: 'Terlalu banyak permintaan. Silakan tunggu beberapa saat.' },
        standardHeaders: true,
        legacyHeaders: false,
    });
    app.use('/api/', limiter);
    // Body Parser (JSON & URL Encoded)
    app.use(express_1.default.json({ limit: '10mb' }));
    app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
    // Static File Serving untuk Sampul Cover Album & Gambar Artis
    app.use('/covers', express_1.default.static(path_1.default.join(env_1.ENV.STORAGE_PATH, 'covers'), {
        maxAge: '30d',
        immutable: true,
    }));
    // Endpoint Cek Kesehatan Sistem
    app.get('/health', (_req, res) => {
        res.status(200).json({
            status: 'UP',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            service: 'Spotify Lite API Service',
        });
    });
    // Endpoint Download APK Release Langsung ke HP
    const handleApkDownload = (_req, res) => {
        const candidatePaths = [
            path_1.default.resolve(__dirname, '../../mobile/build/app/outputs/flutter-apk/app-release.apk'),
            path_1.default.resolve(__dirname, '../public/spotify-lite.apk'),
            path_1.default.resolve(__dirname, '../../backend/public/spotify-lite.apk'),
            path_1.default.resolve(process.cwd(), 'public/spotify-lite.apk'),
            path_1.default.resolve(process.cwd(), 'backend/public/spotify-lite.apk'),
            '/app/public/spotify-lite.apk',
            '/home/gani/spotify_lite/backend/public/spotify-lite.apk',
            '/home/gani/spotify_lite/mobile/build/app/outputs/flutter-apk/app-release.apk',
        ];
        const apkPath = candidatePaths.find((p) => fs_1.default.existsSync(p));
        if (apkPath) {
            res.setHeader('Content-Type', 'application/vnd.android.package-archive');
            res.setHeader('Content-Disposition', 'attachment; filename="SpotifyLite-Release.apk"');
            res.download(apkPath, 'SpotifyLite-Release.apk');
        }
        else {
            res.status(404).json({ success: false, message: 'Berkas APK belum siap atau sedang diperbarui.' });
        }
    };
    app.get('/download/spotify-lite.apk', handleApkDownload);
    app.get('/download/apk', handleApkDownload);
    app.get('/api/v1/download/apk', handleApkDownload);
    app.get('/api/v1/download/spotify-lite.apk', handleApkDownload);
    app.get('/api/v1/download/info', (_req, res) => {
        res.json({
            success: true,
            data: {
                appName: 'Spotify Lite',
                version: '1.0.0',
                platform: 'Android',
                fileSizeMb: 55,
                downloadUrl: '/api/v1/download/apk',
                fileName: 'SpotifyLite-Release.apk',
                features: [
                    'Ringan & Super Cepat (55 MB)',
                    'Hemat Kuota & Baterai',
                    'Lirik Karaoke & Mode Video Musik',
                    'Dukungan Server VPS 24 Jam Online',
                    'Download & Putar Musik Offline'
                ]
            }
        });
    });
    // Registrasi Seluruh Rute API v1
    app.use('/api/v1/auth', auth_routes_1.default);
    app.use('/api/v1/songs', song_routes_1.default);
    app.use('/api/v1/playlists', playlist_routes_1.default);
    app.use('/api/v1/search', search_routes_1.default);
    app.use('/api/v1', artist_routes_1.default);
    app.use('/api/v1/user', user_routes_1.default);
    app.use('/api/v1/admin', admin_routes_1.default);
    // Penanganan Rute Tidak Ditemukan & Error Global
    app.use(error_middleware_1.notFoundHandler);
    app.use(error_middleware_1.globalErrorHandler);
    return app;
};
exports.createApp = createApp;
