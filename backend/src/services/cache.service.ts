import Redis from 'ioredis';
import { ENV } from '../config/env';

class CacheManager {
  private redisClient: Redis | null = null;
  private isRedisConnected = false;
  private memoryCache = new Map<string, { value: string; expiresAt: number }>();

  constructor() {
    this.initRedis();
  }

  private initRedis() {
    try {
      this.redisClient = new Redis({
        host: ENV.REDIS_HOST,
        port: ENV.REDIS_PORT,
        password: ENV.REDIS_PASSWORD,
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
    } catch {
      this.isRedisConnected = false;
    }
  }

  public async get(key: string): Promise<string | null> {
    if (this.isRedisConnected && this.redisClient) {
      try {
        return await this.redisClient.get(key);
      } catch {
        // Fallback
      }
    }

    const item = this.memoryCache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }
    return item.value;
  }

  public async set(key: string, value: string, ttlSeconds: number = 300): Promise<void> {
    if (this.isRedisConnected && this.redisClient) {
      try {
        await this.redisClient.set(key, value, 'EX', ttlSeconds);
        return;
      } catch {
        // Fallback
      }
    }

    this.memoryCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  public async del(key: string): Promise<void> {
    if (this.isRedisConnected && this.redisClient) {
      try {
        await this.redisClient.del(key);
      } catch {
        // Fallback
      }
    }
    this.memoryCache.delete(key);
  }
}

export const cacheService = new CacheManager();
