import 'dart:io';
import 'package:dio/dio.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../player/models/song_model.dart';

class DownloadService {
  static final DownloadService _instance = DownloadService._internal();
  factory DownloadService() => _instance;
  DownloadService._internal();

  /// Mengunduh lagu untuk pemutaran offline tanpa kuota internet
  Future<String?> downloadSong(SongModel song, Function(double progress) onProgress) async {
    try {
      final appDir = await getApplicationDocumentsDirectory();
      final offlineDir = Directory('${appDir.path}/offline_songs');
      if (!await offlineDir.exists()) {
        await offlineDir.create(recursive: true);
      }

      final targetPath = '${offlineDir.path}/${song.id}.mp3';
      final streamUrl = '${ApiEndpoints.baseUrl}${ApiEndpoints.streamSong(song.id)}';

      final dio = Dio();
      await dio.download(
        streamUrl,
        targetPath,
        onReceiveProgress: (received, total) {
          if (total != -1) {
            onProgress(received / total);
          }
        },
      );

      // Simpan metadata ke SharedPreferences
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('download_${song.id}', targetPath);

      return targetPath;
    } catch (e) {
      print('Gagal mengunduh lagu offline: $e');
      return null;
    }
  }

  /// Memeriksa apakah lagu telah diunduh di perangkat
  Future<String?> getDownloadedPath(String songId) async {
    final prefs = await SharedPreferences.getInstance();
    final path = prefs.getString('download_$songId');
    if (path != null && await File(path).exists()) {
      return path;
    }
    return null;
  }

  /// Menghapus berkas unduhan lagu
  Future<void> deleteDownload(String songId) async {
    final prefs = await SharedPreferences.getInstance();
    final path = prefs.getString('download_$songId');
    if (path != null) {
      final file = File(path);
      if (await file.exists()) {
        await file.delete();
      }
      await prefs.remove('download_$songId');
    }
  }
}
