import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { pool, getIsPostgresConnected, inMemoryStore } from '../config/database';
import { ENV } from '../config/env';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { cacheService } from '../services/cache.service';
import { IUser, JwtPayload } from '../types';

export class AuthController {
  public static async register(req: Request, res: Response): Promise<void> {
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
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      const userId = uuidv4();

      if (getIsPostgresConnected()) {
        const checkUser = await pool.query('SELECT id FROM users WHERE email = $1', [emailNormalized]);
        if (checkUser.rows.length > 0) {
          res.status(400).json({ success: false, message: 'Email sudah terdaftar. Silakan login' });
          return;
        }

        const newUserQuery = `
          INSERT INTO users (id, name, email, password_hash, role)
          VALUES ($1, $2, $3, $4, 'user')
          RETURNING id, name, email, role, avatar_url, created_at
        `;
        const result = await pool.query(newUserQuery, [userId, name.trim(), emailNormalized, passwordHash]);
        const user = result.rows[0];

        // Buat settings default
        await pool.query('INSERT INTO user_settings (user_id) VALUES ($1)', [userId]);

        const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, ENV.JWT_SECRET, {
          expiresIn: ENV.JWT_EXPIRES_IN,
        } as jwt.SignOptions);
        const refreshToken = jwt.sign({ userId: user.id }, ENV.JWT_REFRESH_SECRET, {
          expiresIn: ENV.JWT_REFRESH_EXPIRES_IN,
        } as jwt.SignOptions);

        res.status(201).json({
          success: true,
          message: 'Pendaftaran akun berhasil',
          data: { user, token, refreshToken },
        });
      } else {
        // Fallback in-memory
        for (const u of inMemoryStore.users.values()) {
          if (u.email === emailNormalized) {
            res.status(400).json({ success: false, message: 'Email sudah terdaftar. Silakan login' });
            return;
          }
        }

        const newUser: IUser = {
          id: userId,
          name: name.trim(),
          email: emailNormalized,
          password_hash: passwordHash,
          role: 'user',
          avatar_url: null,
          created_at: new Date(),
        };
        inMemoryStore.users.set(userId, newUser);
        inMemoryStore.user_settings.set(userId, {
          user_id: userId,
          audio_quality: 'medium',
          theme: 'dark',
          offline_mode: false,
          last_played_position_seconds: 0,
          last_queue_ids: [],
        });

        const token = jwt.sign({ userId: newUser.id, email: newUser.email, role: newUser.role }, ENV.JWT_SECRET, {
          expiresIn: ENV.JWT_EXPIRES_IN,
        } as jwt.SignOptions);
        const refreshToken = jwt.sign({ userId: newUser.id }, ENV.JWT_REFRESH_SECRET, {
          expiresIn: ENV.JWT_REFRESH_EXPIRES_IN,
        } as jwt.SignOptions);

        const { password_hash: _, ...safeUser } = newUser;
        res.status(201).json({
          success: true,
          message: 'Pendaftaran akun berhasil (Mode Instan)',
          data: { user: safeUser, token, refreshToken },
        });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Gagal mendaftar: ' + error.message });
    }
  }

  public static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ success: false, message: 'Email dan kata sandi wajib diisi' });
        return;
      }

      const emailNormalized = email.toLowerCase().trim();

      if (getIsPostgresConnected()) {
        const query = 'SELECT * FROM users WHERE email = $1';
        const result = await pool.query(query, [emailNormalized]);
        if (result.rows.length === 0) {
          res.status(401).json({ success: false, message: 'Email atau kata sandi salah' });
          return;
        }

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
          res.status(401).json({ success: false, message: 'Email atau kata sandi salah' });
          return;
        }

        const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, ENV.JWT_SECRET, {
          expiresIn: ENV.JWT_EXPIRES_IN,
        } as jwt.SignOptions);
        const refreshToken = jwt.sign({ userId: user.id }, ENV.JWT_REFRESH_SECRET, {
          expiresIn: ENV.JWT_REFRESH_EXPIRES_IN,
        } as jwt.SignOptions);

        const { password_hash: _, ...safeUser } = user;
        res.status(200).json({
          success: true,
          message: 'Login berhasil',
          data: { user: safeUser, token, refreshToken },
        });
      } else {
        // Fallback in-memory
        let matchedUser: IUser | null = null;
        for (const u of inMemoryStore.users.values()) {
          if (u.email === emailNormalized) {
            matchedUser = u;
            break;
          }
        }

        if (!matchedUser) {
          res.status(401).json({ success: false, message: 'Email atau kata sandi salah' });
          return;
        }

        const isMatch = await bcrypt.compare(password, matchedUser.password_hash);
        if (!isMatch) {
          res.status(401).json({ success: false, message: 'Email atau kata sandi salah' });
          return;
        }

        const token = jwt.sign({ userId: matchedUser.id, email: matchedUser.email, role: matchedUser.role }, ENV.JWT_SECRET, {
          expiresIn: ENV.JWT_EXPIRES_IN,
        } as jwt.SignOptions);
        const refreshToken = jwt.sign({ userId: matchedUser.id }, ENV.JWT_REFRESH_SECRET, {
          expiresIn: ENV.JWT_REFRESH_EXPIRES_IN,
        } as jwt.SignOptions);

        const { password_hash: _, ...safeUser } = matchedUser;
        res.status(200).json({
          success: true,
          message: 'Login berhasil',
          data: { user: safeUser, token, refreshToken },
        });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Gagal login: ' + error.message });
    }
  }

  public static async refresh(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        res.status(400).json({ success: false, message: 'Refresh token diperlukan' });
        return;
      }

      const decoded = jwt.verify(refreshToken, ENV.JWT_REFRESH_SECRET) as { userId: string };
      let user: any = null;

      if (getIsPostgresConnected()) {
        const query = 'SELECT id, name, email, role, avatar_url FROM users WHERE id = $1';
        const result = await pool.query(query, [decoded.userId]);
        user = result.rows[0];
      } else {
        user = inMemoryStore.users.get(decoded.userId);
      }

      if (!user) {
        res.status(401).json({ success: false, message: 'Pengguna tidak ditemukan' });
        return;
      }

      const newToken = jwt.sign({ userId: user.id, email: user.email, role: user.role }, ENV.JWT_SECRET, {
        expiresIn: ENV.JWT_EXPIRES_IN,
      } as jwt.SignOptions);

      res.status(200).json({
        success: true,
        message: 'Token berhasil diperbarui',
        data: { token: newToken },
      });
    } catch {
      res.status(401).json({ success: false, message: 'Refresh token tidak valid atau telah kedaluwarsa' });
    }
  }

  public static async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      // Blacklist token selama 15 menit
      await cacheService.set(`blacklist:${token}`, 'true', 900);
    }
    res.status(200).json({ success: true, message: 'Logout berhasil' });
  }

  public static async me(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Pengguna tidak terautentikasi' });
        return;
      }

      if (getIsPostgresConnected()) {
        const query = 'SELECT id, name, email, role, avatar_url, created_at FROM users WHERE id = $1';
        const result = await pool.query(query, [userId]);
        if (result.rows.length === 0) {
          res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan' });
          return;
        }
        res.status(200).json({ success: true, data: result.rows[0] });
      } else {
        const user = inMemoryStore.users.get(userId);
        if (!user) {
          res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan' });
          return;
        }
        const { password_hash: _, ...safeUser } = user;
        res.status(200).json({ success: true, data: safeUser });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Gagal mengambil data profil' });
    }
  }
}
