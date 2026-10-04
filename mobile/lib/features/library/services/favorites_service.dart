import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../player/models/song_model.dart';
import '../../../core/network/api_client.dart';

class FavoritesService extends ChangeNotifier {
  static final FavoritesService _instance = FavoritesService._internal();
  factory FavoritesService() => _instance;
  FavoritesService._internal();

  static const String _storageKey = 'spotify_lite_favorite_songs_v1';
  final List<SongModel> _favoriteSongs = [];

  List<SongModel> get favoriteSongs => List.unmodifiable(_favoriteSongs);
  int get count => _favoriteSongs.length;

  Future<void> init() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final rawJson = prefs.getString(_storageKey);
      if (rawJson != null && rawJson.isNotEmpty) {
        final List list = jsonDecode(rawJson);
        _favoriteSongs.clear();
        for (final item in list) {
          _favoriteSongs.add(SongModel.fromJson(item));
        }
      } else {
        // Berikan lagu awal favorit default yang populer jika masih kosong
        _favoriteSongs.addAll([
          SongModel(
            id: 'yt_yjnSX_iUFVo',
            title: 'Satu Bulan',
            artistId: 'a0100000-0000-0000-0000-000000000001',
            artistName: 'Bernadya',
            durationSeconds: 230,
            coverUrl: 'https://i.ytimg.com/vi/yjnSX_iUFVo/hqdefault.jpg',
            isLiked: true,
          ),
          SongModel(
            id: 'yt_dGcGbF4ex5o',
            title: 'Dan...',
            artistId: 'a0200000-0000-0000-0000-000000000002',
            artistName: 'Sheila on 7',
            durationSeconds: 284,
            coverUrl: 'https://i.ytimg.com/vi/dGcGbF4ex5o/hqdefault.jpg',
            isLiked: true,
          ),
          SongModel(
            id: 'yt__N6vSc_mT6I',
            title: 'Hati-Hati di Jalan',
            artistId: 'a0300000-0000-0000-0000-000000000003',
            artistName: 'Tulus',
            durationSeconds: 242,
            coverUrl: 'https://i.ytimg.com/vi/_N6vSc_mT6I/hqdefault.jpg',
            isLiked: true,
          ),
          SongModel(
            id: 'yt_k4V3Mo61fJM',
            title: 'Fix You',
            artistId: 'a0500000-0000-0000-0000-000000000005',
            artistName: 'Coldplay',
            durationSeconds: 295,
            coverUrl: 'https://i.ytimg.com/vi/k4V3Mo61fJM/hqdefault.jpg',
            isLiked: true,
          ),
        ]);
        await _save();
      }
      notifyListeners();
    } catch (e) {
      debugPrint('Error init favorites: $e');
    }
  }

  bool isFavorite(String songId) {
    return _favoriteSongs.any((s) => s.id == songId);
  }

  Future<bool> toggleFavorite(SongModel song) async {
    final index = _favoriteSongs.indexWhere((s) => s.id == song.id);
    bool added = false;
    if (index >= 0) {
      _favoriteSongs.removeAt(index);
      added = false;
    } else {
      final copy = SongModel(
        id: song.id,
        title: song.title,
        artistId: song.artistId,
        artistName: song.artistName,
        albumId: song.albumId,
        albumTitle: song.albumTitle,
        durationSeconds: song.durationSeconds,
        coverUrl: song.coverUrl,
        lyrics: song.lyrics,
        playCount: song.playCount,
        isLiked: true,
        localFilePath: song.localFilePath,
      );
      _favoriteSongs.insert(0, copy);
      added = true;
    }

    await _save();
    notifyListeners();

    // Sinkronisasi asinkron ke server backend (jika ada koneksi & token)
    _syncWithBackend(song.id);

    return added;
  }

  Future<void> _save() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final list = _favoriteSongs.map((s) => s.toJson()).toList();
      await prefs.setString(_storageKey, jsonEncode(list));
    } catch (e) {
      debugPrint('Gagal menyimpan favorit: $e');
    }
  }

  Future<void> _syncWithBackend(String songId) async {
    try {
      final dio = ApiClient().dio;
      await dio.post('/user/likes/$songId');
    } catch (_) {
      // Abaikan jika offline atau guest
    }
  }
}
