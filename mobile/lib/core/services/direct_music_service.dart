import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:youtube_explode_dart/youtube_explode_dart.dart';
import '../../features/player/models/song_model.dart';

/// Service Mandiri Pemutar & Pencari Musik (Direct Streaming)
/// Berjalan murni 100% di dalam aplikasi HP tanpa membutuhkan backend server atau laptop.
class DirectMusicService {
  static final DirectMusicService instance = DirectMusicService._internal();
  DirectMusicService._internal();

  YoutubeExplode? _yt;
  YoutubeExplode get yt => _yt ??= YoutubeExplode();

  // Cache URL stream audio di memori agar lagu yang sama langsung terputar tanpa jeda (0 ms)
  final Map<String, _CachedStream> _streamCache = {};

  // Cache hasil pencarian/beranda untuk pengalaman instan tanpa loading berulang
  List<SongModel>? _cachedTrending;
  List<SongModel>? _cachedRelaxing;
  List<SongModel>? _cachedViral;

  /// 1. Cari Jutaan Lagu Langsung dari YouTube Music / YouTube
  Future<List<SongModel>> searchSongs(String query, {int limit = 25}) async {
    try {
      final searchList = await yt.search.search(query);
      final List<SongModel> results = [];

      for (final video in searchList.take(limit)) {
        final rawId = video.id.value;
        final cleanTitle = video.title;
        final author = video.author;
        final duration = video.duration?.inSeconds ?? 0;
        final thumbnail = video.thumbnails.highResUrl.isNotEmpty
            ? video.thumbnails.highResUrl
            : video.thumbnails.standardResUrl;

        results.add(
          SongModel(
            id: 'yt_$rawId',
            title: cleanTitle,
            artistId: 'art_${author.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '_')}',
            artistName: author,
            albumTitle: 'YouTube Music',
            durationSeconds: duration,
            coverUrl: thumbnail,
            isLiked: false,
          ),
        );
      }
      return results;
    } catch (e) {
      debugPrint('DirectMusicService.searchSongs error: $e');
      return [];
    }
  }

  /// 2. Dapatkan URL Audio Stream (M4A/AAC) Berkualitas Tinggi & Hemat Data
  Future<String?> getStreamUrl(String songId) async {
    final cleanId = songId.replaceFirst('yt_', '');

    // Cek apakah URL audio masih valid di cache memori (berlaku 5 jam)
    final cached = _streamCache[cleanId];
    if (cached != null && DateTime.now().isBefore(cached.expiresAt)) {
      return cached.url;
    }

    try {
      final manifest = await yt.videos.streamsClient.getManifest(cleanId);
      final audioStreams = manifest.audioOnly;
      if (audioStreams.isEmpty) return null;

      // Ambil stream audio dengan kualitas bitrate terbaik
      final bestAudio = audioStreams.withHighestBitrate();
      final streamUrl = bestAudio.url.toString();

      // Simpan ke cache
      _streamCache[cleanId] = _CachedStream(
        url: streamUrl,
        expiresAt: DateTime.now().add(const Duration(hours: 5)),
      );

      return streamUrl;
    } catch (e) {
      debugPrint('DirectMusicService.getStreamUrl error for $cleanId: $e');
      return null;
    }
  }

  /// 3. Kategori: Lagu Populer & Hits Indonesia
  Future<List<SongModel>> getTrendingSongs() async {
    if (_cachedTrending != null && _cachedTrending!.isNotEmpty) {
      return _cachedTrending!;
    }
    final songs = await searchSongs('Top Hits Indonesia 2026 Bernadya Mahalini Tulus Nadin', limit: 20);
    if (songs.isNotEmpty) _cachedTrending = songs;
    return songs;
  }

  /// 4. Kategori: Lagu Santai & Akustik
  Future<List<SongModel>> getRelaxingSongs() async {
    if (_cachedRelaxing != null && _cachedRelaxing!.isNotEmpty) {
      return _cachedRelaxing!;
    }
    final songs = await searchSongs('Lagu Akustik Indonesia Santai Chill', limit: 20);
    if (songs.isNotEmpty) _cachedRelaxing = songs;
    return songs;
  }

  /// 5. Kategori: Viral & Trending Sekarang
  Future<List<SongModel>> getViralSongs() async {
    if (_cachedViral != null && _cachedViral!.isNotEmpty) {
      return _cachedViral!;
    }
    final songs = await searchSongs('Lagu Populer Viral Indonesia Terbaru', limit: 20);
    if (songs.isNotEmpty) _cachedViral = songs;
    return songs;
  }

  void dispose() {
    _yt?.close();
    _yt = null;
  }
}

class _CachedStream {
  final String url;
  final DateTime expiresAt;
  _CachedStream({required this.url, required this.expiresAt});
}
