import { Router } from 'express';
import { ArtistController } from '../controllers/artist.controller';

const router = Router();

router.get('/artists', ArtistController.getArtists);
router.get('/artists/:id', ArtistController.getArtistById);
router.get('/albums', ArtistController.getAlbums);
router.get('/albums/:id', ArtistController.getAlbumById);

export default router;
