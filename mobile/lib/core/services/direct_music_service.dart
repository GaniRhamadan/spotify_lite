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

  /// 2. Dapatkan URL Audio Stream (M4A/AAC) Berkualitas Tinggi & Kompatibel Penuh ExoPlayer Android
  Future<String?> getStreamUrl(String songId, {String? title, String? artist}) async {
    final cleanId = songId.replaceFirst('yt_', '').trim();

    // 1. Cek cache memori dulu
    if (cleanId.isNotEmpty) {
      final cached = _streamCache[cleanId];
      if (cached != null && DateTime.now().isBefore(cached.expiresAt)) {
        return cached.url;
      }
    }

    // 2. Coba ambil langsung jika cleanId adalah YouTube ID 11 karakter
    if (cleanId.length == 11) {
      try {
        final video = await yt.videos.get(cleanId);
        final manifest = await yt.videos.streamsClient.getManifest(video.id);
        final audioStreams = manifest.audioOnly;
        if (audioStreams.isNotEmpty) {
          // Utamakan MP4 (M4A / AAC) karena 100% didukung hardware decoder Android ExoPlayer
          final mp4Audios = audioStreams.where((s) => s.container.name.toLowerCase() == 'mp4');
          final bestAudio = mp4Audios.isNotEmpty
              ? mp4Audios.withHighestBitrate()
              : audioStreams.withHighestBitrate();

          final streamUrl = bestAudio.url.toString();
          _streamCache[cleanId] = _CachedStream(
            url: streamUrl,
            expiresAt: DateTime.now().add(const Duration(hours: 5)),
          );
          return streamUrl;
        }
      } catch (e) {
        debugPrint('Direct lookup failed for video ID $cleanId: $e. Mencoba fallback pencarian...');
      }
    }

    // 3. Fallback: Cari judul & nama artis di YouTube Music
    final searchTerms = '${title ?? ''} ${artist ?? ''}'.trim();
    if (searchTerms.isNotEmpty) {
      try {
        debugPrint('Mencari fallback stream untuk query: $searchTerms');
        final searchResults = await yt.search.search(searchTerms);
        if (searchResults.isNotEmpty) {
          final topVideo = searchResults.first;
          final manifest = await yt.videos.streamsClient.getManifest(topVideo.id);
          final audioStreams = manifest.audioOnly;
          if (audioStreams.isNotEmpty) {
            final mp4Audios = audioStreams.where((s) => s.container.name.toLowerCase() == 'mp4');
            final bestAudio = mp4Audios.isNotEmpty
                ? mp4Audios.withHighestBitrate()
                : audioStreams.withHighestBitrate();

            final streamUrl = bestAudio.url.toString();
            if (cleanId.isNotEmpty) {
              _streamCache[cleanId] = _CachedStream(
                url: streamUrl,
                expiresAt: DateTime.now().add(const Duration(hours: 5)),
              );
            }
            return streamUrl;
          }
        }
      } catch (e) {
        debugPrint('Fallback search failed for $searchTerms: $e');
      }
    }

    return null;
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
