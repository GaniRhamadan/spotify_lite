import { Pool } from 'pg';
import { ENV } from './env';

export const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      }
    : {
        host: ENV.DB_HOST,
        port: ENV.DB_PORT,
        user: ENV.DB_USER,
        password: ENV.DB_PASSWORD,
        database: ENV.DB_NAME,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      }
);

let isPostgresConnected = false;

import fs from 'fs';
import path from 'path';

// Uji koneksi ke PostgreSQL saat server dinyalakan & migrasi skema jika tabel belum ada
export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT NOW()');
    console.log('✅ Terhubung ke database PostgreSQL:', res.rows[0].now);

    // Pastikan skema tabel sudah siap
    const tableCheck = await client.query(
      "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'songs'"
    );
    if (tableCheck.rows.length === 0) {
      console.log('📦 Menginisialisasi skema database Spotify Lite (schema.sql)...');
      const schemaPath = path.join(__dirname, 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await client.query(schemaSql);
        console.log('✅ Skema tabel berhasil diinisialisasi ke PostgreSQL!');
      }
    }

    client.release();
    isPostgresConnected = true;
    return true;
  } catch (err: any) {
    isPostgresConnected = false;
    console.warn('⚠️ Tidak dapat terhubung ke PostgreSQL lokal (' + err.message + ').');
    console.log('ℹ️ Mengaktifkan InMemory Mock Store agar server tetap berjalan normal untuk demo & pengujian.');
    return false;
  }
};

export const getIsPostgresConnected = () => isPostgresConnected;

// ====================================================================
// IN-MEMORY MOCK STORE (Fallback saat PostgreSQL belum menyala)
// ====================================================================
export const inMemoryStore = {
  users: new Map<string, any>(),
  artists: new Map<string, any>(),
  albums: new Map<string, any>(),
  songs: new Map<string, any>(),
  playlists: new Map<string, any>(),
  playlist_songs: [] as { id: string; playlist_id: string; song_id: string; order_index: number }[],
  liked_songs: new Set<string>(), // format: "userId:songId"
  play_history: [] as { id: string; user_id: string; song_id: string; played_at: Date }[],
  user_settings: new Map<string, any>(),
};
