"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class ImageService {
    /**
     * Menyimpan dan memverifikasi cover art (JPG/PNG/WebP)
     */
    static processCoverImage(sourcePath, targetFilename) {
        const storageDir = path_1.default.dirname(sourcePath);
        const destination = path_1.default.join(storageDir, targetFilename);
        if (!fs_1.default.existsSync(storageDir)) {
            fs_1.default.mkdirSync(storageDir, { recursive: true });
        }
        if (sourcePath !== destination && fs_1.default.existsSync(sourcePath)) {
            fs_1.default.copyFileSync(sourcePath, destination);
        }
        return targetFilename;
    }
}
exports.ImageService = ImageService;
