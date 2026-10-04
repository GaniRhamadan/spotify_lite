"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inMemoryStore = exports.getIsPostgresConnected = exports.checkDatabaseConnection = exports.pool = void 0;
const pg_1 = require("pg");
const env_1 = require("./env");
exports.pool = new pg_1.Pool({
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
// Uji koneksi ke PostgreSQL saat server dinyalakan
const checkDatabaseConnection = async () => {
    try {
        const client = await exports.pool.connect();
        const res = await client.query('SELECT NOW()');
        client.release();
        isPostgresConnected = true;
        console.log('✅ Terhubung ke database PostgreSQL:', res.rows[0].now);
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
