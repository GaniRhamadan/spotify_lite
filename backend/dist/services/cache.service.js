"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheService = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("../config/env");
class CacheManager {
    redisClient = null;
    isRedisConnected = false;
    memoryCache = new Map();
    constructor() {
        this.initRedis();
    }
    initRedis() {
        try {
            this.redisClient = new ioredis_1.default({
                host: env_1.ENV.REDIS_HOST,
                port: env_1.ENV.REDIS_PORT,
                password: env_1.ENV.REDIS_PASSWORD,
                lazyConnect: true,
                connectTimeout: 2000,
                retryStrategy: () => null, // Jangan spam retry jika redis mati
            });
            this.redisClient.connect().then(() => {
                this.isRedisConnected = true;
                console.log('✅ Terhubung ke Redis Cache Server.');
            }).catch(() => {
                this.isRedisConnected = false;
                console.log('ℹ️ Redis tidak ditemukan. Menggunakan in-memory cache cadangan.');
            });
            this.redisClient.on('error', () => {
                this.isRedisConnected = false;
            });
        }
        catch {
            this.isRedisConnected = false;
        }
    }
    async get(key) {
        if (this.isRedisConnected && this.redisClient) {
            try {
                return await this.redisClient.get(key);
            }
            catch {
                // Fallback
            }
        }
        const item = this.memoryCache.get(key);
        if (!item)
            return null;
        if (Date.now() > item.expiresAt) {
            this.memoryCache.delete(key);
            return null;
        }
        return item.value;
    }
    async set(key, value, ttlSeconds = 300) {
        if (this.isRedisConnected && this.redisClient) {
            try {
                await this.redisClient.set(key, value, 'EX', ttlSeconds);
                return;
            }
            catch {
                // Fallback
            }
        }
        this.memoryCache.set(key, {
            value,
            expiresAt: Date.now() + ttlSeconds * 1000,
        });
    }
    async del(key) {
        if (this.isRedisConnected && this.redisClient) {
            try {
                await this.redisClient.del(key);
            }
            catch {
                // Fallback
            }
        }
        this.memoryCache.delete(key);
    }
}
exports.cacheService = new CacheManager();
