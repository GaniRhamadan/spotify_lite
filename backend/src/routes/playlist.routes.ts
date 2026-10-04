import { Router } from 'express';
import { PlaylistController } from '../controllers/playlist.controller';
import { authenticateJWT, optionalJWT } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', optionalJWT, PlaylistController.getPlaylists);
router.post('/', authenticateJWT, PlaylistController.createPlaylist);
router.get('/:id', optionalJWT, PlaylistController.getPlaylistById);
router.delete('/:id', authenticateJWT, PlaylistController.deletePlaylist);
router.post('/:id/songs', authenticateJWT, PlaylistController.addSongToPlaylist);
router.delete('/:id/songs/:songId', authenticateJWT, PlaylistController.removeSongFromPlaylist);
router.put('/:id/reorder', authenticateJWT, PlaylistController.reorderSongs);

export default router;
