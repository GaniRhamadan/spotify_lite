import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = Router();

// Liked Songs
router.post('/likes/:songId', authenticateJWT, UserController.toggleLikeSong);
router.get('/likes', authenticateJWT, UserController.getLikedSongs);

// History
router.post('/history', authenticateJWT, UserController.recordHistory);
router.get('/history', authenticateJWT, UserController.getHistory);

// Settings & Player Sync
router.get('/settings', authenticateJWT, UserController.getSettings);
router.put('/settings', authenticateJWT, UserController.updateSettings);
router.post('/sync-state', authenticateJWT, UserController.syncState);

export default router;
