"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.inMemoryStore = exports.getIsPostgresConnected = exports.checkDatabaseConnection = exports.pool = void 0;
const pg_1 = require("pg");
const env_1 = require("./env");
exports.pool = new pg_1.Pool(process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
    }
    : {
        host: env_1.ENV.DB_HOST,
        port: env_1.ENV.DB_PORT,
        user: env_1.ENV.DB_USER,
        password: env_1.ENV.DB_PASSWORD,
        database: env_1.ENV.DB_NAME,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    });
let isPostgresConnected = false;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Uji koneksi ke PostgreSQL saat server dinyalakan & migrasi skema jika tabel belum ada
const checkDatabaseConnection = async () => {
    try {
        const client = await exports.pool.connect();
        const res = await client.query('SELECT NOW()');
        console.log('✅ Terhubung ke database PostgreSQL:', res.rows[0].now);
        // Pastikan skema tabel sudah siap
        const tableCheck = await client.query("SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'songs'");
        if (tableCheck.rows.length === 0) {
            console.log('📦 Menginisialisasi skema database Spotify Lite (schema.sql)...');
            const schemaPath = path_1.default.join(__dirname, 'schema.sql');
            if (fs_1.default.existsSync(schemaPath)) {
                const schemaSql = fs_1.default.readFileSync(schemaPath, 'utf8');
                await client.query(schemaSql);
                console.log('✅ Skema tabel berhasil diinisialisasi ke PostgreSQL!');
            }
        }
        client.release();
        isPostgresConnected = true;
        return true;
    }
    catch (err) {
        isPostgresConnected = false;
        console.warn('⚠️ Tidak dapat terhubung ke PostgreSQL lokal (' + err.message + ').');
        console.log('ℹ️ Mengaktifkan InMemory Mock Store agar server tetap berjalan normal untuk demo & pengujian.');
        return false;
    }
};
exports.checkDatabaseConnection = checkDatabaseConnection;
const getIsPostgresConnected = () => isPostgresConnected;
exports.getIsPostgresConnected = getIsPostgresConnected;
// ====================================================================
// IN-MEMORY MOCK STORE (Fallback saat PostgreSQL belum menyala)
// ====================================================================
exports.inMemoryStore = {
    users: new Map(),
    artists: new Map(),
    albums: new Map(),
    songs: new Map(),
    playlists: new Map(),
    playlist_songs: [],
    liked_songs: new Set(), // format: "userId:songId"
    play_history: [],
    user_settings: new Map(),
};
