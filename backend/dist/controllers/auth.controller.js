"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const database_1 = require("../config/database");
const env_1 = require("../config/env");
const cache_service_1 = require("../services/cache.service");
class AuthController {
    static async register(req, res) {
        try {
            const { name, email, password } = req.body;
            if (!name || !email || !password) {
                res.status(400).json({ success: false, message: 'Nama, email, dan kata sandi wajib diisi' });
                return;
            }
            if (password.length < 6) {
                res.status(400).json({ success: false, message: 'Kata sandi minimal 6 karakter' });
                return;
            }
            const emailNormalized = email.toLowerCase().trim();
            const salt = await bcryptjs_1.default.genSalt(10);
            const passwordHash = await bcryptjs_1.default.hash(password, salt);
            const userId = (0, uuid_1.v4)();
            if ((0, database_1.getIsPostgresConnected)()) {
                const checkUser = await database_1.pool.query('SELECT id FROM users WHERE email = $1', [emailNormalized]);
                if (checkUser.rows.length > 0) {
                    res.status(400).json({ success: false, message: 'Email sudah terdaftar. Silakan login' });
                    return;
                }
                const newUserQuery = `
          INSERT INTO users (id, name, email, password_hash, role)
          VALUES ($1, $2, $3, $4, 'user')
          RETURNING id, name, email, role, avatar_url, created_at
        `;
                const result = await database_1.pool.query(newUserQuery, [userId, name.trim(), emailNormalized, passwordHash]);
                const user = result.rows[0];
                // Buat settings default
                await database_1.pool.query('INSERT INTO user_settings (user_id) VALUES ($1)', [userId]);
                const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, role: user.role }, env_1.ENV.JWT_SECRET, {
                    expiresIn: env_1.ENV.JWT_EXPIRES_IN,
                });
                const refreshToken = jsonwebtoken_1.default.sign({ userId: user.id }, env_1.ENV.JWT_REFRESH_SECRET, {
                    expiresIn: env_1.ENV.JWT_REFRESH_EXPIRES_IN,
                });
                res.status(201).json({
                    success: true,
                    message: 'Pendaftaran akun berhasil',
                    data: { user, token, refreshToken },
                });
            }
            else {
                // Fallback in-memory
                for (const u of database_1.inMemoryStore.users.values()) {
                    if (u.email === emailNormalized) {
                        res.status(400).json({ success: false, message: 'Email sudah terdaftar. Silakan login' });
                        return;
                    }
                }
                const newUser = {
                    id: userId,
                    name: name.trim(),
                    email: emailNormalized,
                    password_hash: passwordHash,
                    role: 'user',
                    avatar_url: null,
                    created_at: new Date(),
                };
                database_1.inMemoryStore.users.set(userId, newUser);
                database_1.inMemoryStore.user_settings.set(userId, {
                    user_id: userId,
                    audio_quality: 'medium',
                    theme: 'dark',
                    offline_mode: false,
                    last_played_position_seconds: 0,
                    last_queue_ids: [],
                });
                const token = jsonwebtoken_1.default.sign({ userId: newUser.id, email: newUser.email, role: newUser.role }, env_1.ENV.JWT_SECRET, {
                    expiresIn: env_1.ENV.JWT_EXPIRES_IN,
                });
                const refreshToken = jsonwebtoken_1.default.sign({ userId: newUser.id }, env_1.ENV.JWT_REFRESH_SECRET, {
                    expiresIn: env_1.ENV.JWT_REFRESH_EXPIRES_IN,
                });
                const { password_hash: _, ...safeUser } = newUser;
                res.status(201).json({
                    success: true,
                    message: 'Pendaftaran akun berhasil (Mode Instan)',
                    data: { user: safeUser, token, refreshToken },
                });
            }
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Gagal mendaftar: ' + error.message });
        }
    }
    static async login(req, res) {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                res.status(400).json({ success: false, message: 'Email dan kata sandi wajib diisi' });
                return;
            }
            const emailNormalized = email.toLowerCase().trim();
            if ((0, database_1.getIsPostgresConnected)()) {
                const query = 'SELECT * FROM users WHERE email = $1';
                const result = await database_1.pool.query(query, [emailNormalized]);
                if (result.rows.length === 0) {
                    res.status(401).json({ success: false, message: 'Email atau kata sandi salah' });
                    return;
                }
                const user = result.rows[0];
                const isMatch = await bcryptjs_1.default.compare(password, user.password_hash);
                if (!isMatch) {
                    res.status(401).json({ success: false, message: 'Email atau kata sandi salah' });
                    return;
                }
                const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, role: user.role }, env_1.ENV.JWT_SECRET, {
                    expiresIn: env_1.ENV.JWT_EXPIRES_IN,
                });
                const refreshToken = jsonwebtoken_1.default.sign({ userId: user.id }, env_1.ENV.JWT_REFRESH_SECRET, {
                    expiresIn: env_1.ENV.JWT_REFRESH_EXPIRES_IN,
                });
                const { password_hash: _, ...safeUser } = user;
                res.status(200).json({
                    success: true,
                    message: 'Login berhasil',
                    data: { user: safeUser, token, refreshToken },
                });
            }
            else {
                // Fallback in-memory
                let matchedUser = null;
                for (const u of database_1.inMemoryStore.users.values()) {
                    if (u.email === emailNormalized) {
                        matchedUser = u;
                        break;
                    }
                }
                if (!matchedUser) {
                    res.status(401).json({ success: false, message: 'Email atau kata sandi salah' });
                    return;
                }
                const isMatch = await bcryptjs_1.default.compare(password, matchedUser.password_hash);
                if (!isMatch) {
                    res.status(401).json({ success: false, message: 'Email atau kata sandi salah' });
                    return;
                }
                const token = jsonwebtoken_1.default.sign({ userId: matchedUser.id, email: matchedUser.email, role: matchedUser.role }, env_1.ENV.JWT_SECRET, {
                    expiresIn: env_1.ENV.JWT_EXPIRES_IN,
                });
                const refreshToken = jsonwebtoken_1.default.sign({ userId: matchedUser.id }, env_1.ENV.JWT_REFRESH_SECRET, {
                    expiresIn: env_1.ENV.JWT_REFRESH_EXPIRES_IN,
                });
                const { password_hash: _, ...safeUser } = matchedUser;
                res.status(200).json({
                    success: true,
                    message: 'Login berhasil',
                    data: { user: safeUser, token, refreshToken },
                });
            }
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Gagal login: ' + error.message });
        }
    }
    static async refresh(req, res) {
        try {
            const { refreshToken } = req.body;
            if (!refreshToken) {
                res.status(400).json({ success: false, message: 'Refresh token diperlukan' });
                return;
            }
            const decoded = jsonwebtoken_1.default.verify(refreshToken, env_1.ENV.JWT_REFRESH_SECRET);
            let user = null;
            if ((0, database_1.getIsPostgresConnected)()) {
                const query = 'SELECT id, name, email, role, avatar_url FROM users WHERE id = $1';
                const result = await database_1.pool.query(query, [decoded.userId]);
                user = result.rows[0];
            }
            else {
                user = database_1.inMemoryStore.users.get(decoded.userId);
            }
            if (!user) {
                res.status(401).json({ success: false, message: 'Pengguna tidak ditemukan' });
                return;
            }
            const newToken = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, role: user.role }, env_1.ENV.JWT_SECRET, {
                expiresIn: env_1.ENV.JWT_EXPIRES_IN,
            });
            res.status(200).json({
                success: true,
                message: 'Token berhasil diperbarui',
                data: { token: newToken },
            });
        }
        catch {
            res.status(401).json({ success: false, message: 'Refresh token tidak valid atau telah kedaluwarsa' });
        }
    }
    static async logout(req, res) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            // Blacklist token selama 15 menit
            await cache_service_1.cacheService.set(`blacklist:${token}`, 'true', 900);
        }
        res.status(200).json({ success: true, message: 'Logout berhasil' });
    }
    static async me(req, res) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({ success: false, message: 'Pengguna tidak terautentikasi' });
                return;
            }
            if ((0, database_1.getIsPostgresConnected)()) {
                const query = 'SELECT id, name, email, role, avatar_url, created_at FROM users WHERE id = $1';
                const result = await database_1.pool.query(query, [userId]);
                if (result.rows.length === 0) {
                    res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan' });
                    return;
                }
                res.status(200).json({ success: true, data: result.rows[0] });
            }
            else {
                const user = database_1.inMemoryStore.users.get(userId);
                if (!user) {
                    res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan' });
                    return;
                }
                const { password_hash: _, ...safeUser } = user;
                res.status(200).json({ success: true, data: safeUser });
            }
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Gagal mengambil data profil' });
        }
    }
}
exports.AuthController = AuthController;
