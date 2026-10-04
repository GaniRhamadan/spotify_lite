import 'package:audio_service/audio_service.dart';
import '../../../core/constants/api_endpoints.dart';

class SongModel {
  final String id;
  final String title;
  final String artistId;
  final String artistName;
  final String? albumId;
  final String? albumTitle;
  final int durationSeconds;
  final String? coverUrl;
  final String? lyrics;
  final int playCount;
  bool isLiked;
  final String? localFilePath; // Jika lagu sudah diunduh untuk mode offline

  SongModel({
    required this.id,
    required this.title,
    required this.artistId,
    required this.artistName,
    this.albumId,
    this.albumTitle,
    required this.durationSeconds,
    this.coverUrl,
    this.lyrics,
    this.playCount = 0,
    this.isLiked = false,
    this.localFilePath,
  });

  factory SongModel.fromJson(Map<String, dynamic> json) {
    return SongModel(
      id: json['id'] ?? '',
      title: json['title'] ?? 'Lagu Tanpa Judul',
      artistId: json['artist_id'] ?? '',
      artistName: json['artist_name'] ?? 'Artis',
      albumId: json['album_id'],
      albumTitle: json['album_title'],
      durationSeconds: json['duration_seconds'] ?? 0,
      coverUrl: json['cover_url'],
      lyrics: json['lyrics'],
      playCount: json['play_count'] ?? 0,
      isLiked: json['is_liked'] ?? false,
      localFilePath: json['local_file_path'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'artist_id': artistId,
      'artist_name': artistName,
      'album_id': albumId,
      'album_title': albumTitle,
      'duration_seconds': durationSeconds,
      'cover_url': coverUrl,
      'lyrics': lyrics,
      'play_count': playCount,
      'is_liked': isLiked,
      'local_file_path': localFilePath,
    };
  }

  /// Konversi ke MediaItem AudioService untuk integrasi notifikasi Android & Lock Screen
  MediaItem toMediaItem() {
    return MediaItem(
      id: id,
      album: albumTitle ?? 'Spotify Lite Single',
      title: title,
      artist: artistName,
      duration: Duration(seconds: durationSeconds),
      artUri: coverUrl != null ? Uri.parse(coverUrl!) : null,
      extras: {
        'url': localFilePath ?? '${ApiEndpoints.baseUrl}${ApiEndpoints.streamSong(id)}',
        'is_offline': localFilePath != null,
      },
    );
  }
}
