import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authenticateJWT, requireAdmin } from '../middlewares/auth.middleware';
import { uploadMedia } from '../middlewares/upload.middleware';

const router = Router();

// Endpoint upload lagu (audio + cover + metadata)
router.post(
  '/upload/song',
  authenticateJWT,
  requireAdmin,
  uploadMedia.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'cover', maxCount: 1 },
  ]),
  AdminController.uploadSong
);

router.post('/artists', authenticateJWT, requireAdmin, AdminController.createArtist);
router.post('/albums', authenticateJWT, requireAdmin, AdminController.createAlbum);
router.delete('/songs/:id', authenticateJWT, requireAdmin, AdminController.deleteSong);
router.get('/stats', authenticateJWT, requireAdmin, AdminController.getStats);

export default router;
