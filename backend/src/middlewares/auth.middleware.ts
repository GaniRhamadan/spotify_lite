import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { JwtPayload } from '../types';
import { cacheService } from '../services/cache.service';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export const authenticateJWT = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
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
  const isBlacklisted = await cacheService.get(`blacklist:${token}`);
  if (isBlacklisted) {
    res.status(401).json({
      success: false,
      message: 'Sesi telah kedaluwarsa. Silakan login kembali',
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch (err: any) {
    res.status(401).json({
      success: false,
      message: 'Token tidak valid atau telah kedaluwarsa',
    });
  }
};

export const optionalJWT = async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, ENV.JWT_SECRET) as JwtPayload;
      req.user = decoded;
    } catch {
      // Abaikan jika token salah untuk rute opsional
    }
  }
  next();
};

export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({
      success: false,
      message: 'Akses ditolak: Memerlukan hak akses administrator',
    });
    return;
  }
  next();
};
