import fs from 'fs';
import path from 'path';

export class ImageService {
  /**
   * Menyimpan dan memverifikasi cover art (JPG/PNG/WebP)
   */
  public static processCoverImage(sourcePath: string, targetFilename: string): string {
    const storageDir = path.dirname(sourcePath);
    const destination = path.join(storageDir, targetFilename);

    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    if (sourcePath !== destination && fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, destination);
    }

    return targetFilename;
  }
}
