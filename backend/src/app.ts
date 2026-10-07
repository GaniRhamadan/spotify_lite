import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { ENV } from './config/env';
import authRoutes from './routes/auth.routes';
import songRoutes from './routes/song.routes';
import playlistRoutes from './routes/playlist.routes';
import searchRoutes from './routes/search.routes';
import artistRoutes from './routes/artist.routes';
import userRoutes from './routes/user.routes';
import adminRoutes from './routes/admin.routes';
import { notFoundHandler, globalErrorHandler } from './middlewares/error.middleware';

export const createApp = (): Application => {
  const app = express();

  // Middleware Keamanan Helmet (dengan pengecualian header media stream agar bisa diputar lintas origin)
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // CORS: Izinkan akses dari aplikasi Web dan Mobile
  app.use(
    cors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Range'],
      exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length'],
    })
  );

  // Rate Limiting untuk perlindungan dari serangan DDoS / brute force
  const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 menit
    max: 300, // maks 300 request per menit per IP
    message: { success: false, message: 'Terlalu banyak permintaan. Silakan tunggu beberapa saat.' },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', limiter);

  // Body Parser (JSON & URL Encoded)
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Static File Serving untuk Sampul Cover Album & Gambar Artis
  app.use(
    '/covers',
    express.static(path.join(ENV.STORAGE_PATH, 'covers'), {
      maxAge: '30d',
      immutable: true,
    })
  );

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
  app.get('/download/spotify-lite.apk', (_req, res) => {
    const candidatePaths = [
      path.resolve(__dirname, '../../mobile/build/app/outputs/flutter-apk/app-release.apk'),
      path.resolve(__dirname, '../public/spotify-lite.apk'),
      path.resolve(process.cwd(), 'public/spotify-lite.apk'),
    ];
    const apkPath = candidatePaths.find((p) => fs.existsSync(p));
    if (apkPath) {
      res.download(apkPath, 'SpotifyLite-Release.apk');
    } else {
      res.status(404).send('Berkas APK belum siap.');
    }
  });

  // Registrasi Seluruh Rute API v1
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/songs', songRoutes);
  app.use('/api/v1/playlists', playlistRoutes);
  app.use('/api/v1/search', searchRoutes);
  app.use('/api/v1', artistRoutes);
  app.use('/api/v1/user', userRoutes);
  app.use('/api/v1/admin', adminRoutes);

  // Penanganan Rute Tidak Ditemukan & Error Global
  app.use(notFoundHandler);
  app.use(globalErrorHandler);

  return app;
};
