"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = exports.optionalJWT = exports.authenticateJWT = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const cache_service_1 = require("../services/cache.service");
const authenticateJWT = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
            success: false,
            message: 'Akses ditolak: Token autentikasi tidak ditemukan',
        });
        return;
    }
    const token = authHeader.split(' ')[1];
    // Periksa apakah token ada di daftar blacklist logout
    const isBlacklisted = await cache_service_1.cacheService.get(`blacklist:${token}`);
    if (isBlacklisted) {
        res.status(401).json({
            success: false,
            message: 'Sesi telah kedaluwarsa. Silakan login kembali',
        });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, env_1.ENV.JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (err) {
        res.status(401).json({
            success: false,
            message: 'Token tidak valid atau telah kedaluwarsa',
        });
    }
};
exports.authenticateJWT = authenticateJWT;
const optionalJWT = async (req, _res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jsonwebtoken_1.default.verify(token, env_1.ENV.JWT_SECRET);
            req.user = decoded;
        }
        catch {
            // Abaikan jika token salah untuk rute opsional
        }
    }
    next();
};
exports.optionalJWT = optionalJWT;
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        res.status(403).json({
            success: false,
            message: 'Akses ditolak: Memerlukan hak akses administrator',
        });
        return;
    }
    next();
};
exports.requireAdmin = requireAdmin;
