import { Router } from 'express';
import { SongController } from '../controllers/song.controller';
import { StreamController } from '../controllers/stream.controller';
import { optionalJWT } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', optionalJWT, SongController.getAllSongs);
router.get('/trending', optionalJWT, SongController.getTrending);
router.get('/:id', optionalJWT, SongController.getSongById);
router.get('/:id/stream', StreamController.streamSong);

export default router;
