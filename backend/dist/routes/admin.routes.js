"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_controller_1 = require("../controllers/admin.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const upload_middleware_1 = require("../middlewares/upload.middleware");
const router = (0, express_1.Router)();
// Endpoint upload lagu (audio + cover + metadata)
router.post('/upload/song', auth_middleware_1.authenticateJWT, auth_middleware_1.requireAdmin, upload_middleware_1.uploadMedia.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'cover', maxCount: 1 },
]), admin_controller_1.AdminController.uploadSong);
router.post('/artists', auth_middleware_1.authenticateJWT, auth_middleware_1.requireAdmin, admin_controller_1.AdminController.createArtist);
router.post('/albums', auth_middleware_1.authenticateJWT, auth_middleware_1.requireAdmin, admin_controller_1.AdminController.createAlbum);
router.delete('/songs/:id', auth_middleware_1.authenticateJWT, auth_middleware_1.requireAdmin, admin_controller_1.AdminController.deleteSong);
router.get('/stats', auth_middleware_1.authenticateJWT, auth_middleware_1.requireAdmin, admin_controller_1.AdminController.getStats);
exports.default = router;
