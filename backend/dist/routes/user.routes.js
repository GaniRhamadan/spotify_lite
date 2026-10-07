"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Liked Songs
router.post('/likes/import', auth_middleware_1.authenticateJWT, user_controller_1.UserController.importLikedSongs);
router.post('/likes/:songId', auth_middleware_1.authenticateJWT, user_controller_1.UserController.toggleLikeSong);
router.get('/likes', auth_middleware_1.authenticateJWT, user_controller_1.UserController.getLikedSongs);
// History
router.post('/history', auth_middleware_1.authenticateJWT, user_controller_1.UserController.recordHistory);
router.get('/history', auth_middleware_1.authenticateJWT, user_controller_1.UserController.getHistory);
// Settings & Player Sync
router.get('/settings', auth_middleware_1.authenticateJWT, user_controller_1.UserController.getSettings);
router.put('/settings', auth_middleware_1.authenticateJWT, user_controller_1.UserController.updateSettings);
router.post('/sync-state', auth_middleware_1.authenticateJWT, user_controller_1.UserController.syncState);
exports.default = router;
