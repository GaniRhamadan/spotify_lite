import 'package:shared_preferences/shared_preferences.dart';

class ApiEndpoints {
  // Default: 127.0.0.1 (aktif otomatis dengan adb reverse tcp:5000 tcp:5000)
  // Untuk emulator: 10.0.2.2:5000, Untuk Wi-Fi LAN: 192.168.1.20:5000
  static String baseUrl = 'http://127.0.0.1:5000/api/v1';

  static const String keyCustomBaseUrl = 'custom_api_base_url';

  static const List<Map<String, String>> presets = [
    {
      'label': 'USB Reverse (Direkomendasikan via Kabel)',
      'url': 'http://127.0.0.1:5000/api/v1',
    },
    {
      'label': 'Wi-Fi LAN (192.168.1.20)',
      'url': 'http://192.168.1.20:5000/api/v1',
    },
    {
      'label': 'Emulator Android Studio (10.0.2.2)',
      'url': 'http://10.0.2.2:5000/api/v1',
    },
  ];

  static Future<void> init() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedUrl = prefs.getString(keyCustomBaseUrl);
      if (savedUrl != null && savedUrl.trim().isNotEmpty) {
        baseUrl = savedUrl.trim();
      }
    } catch (e) {
      // Abaikan error SharedPreferences
    }
  }

  static Future<void> setBaseUrl(String newUrl) async {
    baseUrl = newUrl.trim();
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(keyCustomBaseUrl, baseUrl);
    } catch (e) {
      // Abaikan
    }
  }

  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String me = '/auth/me';

  static const String songs = '/songs';
  static const String trendingSongs = '/songs/trending';
  static String streamSong(String id) => '/songs/$id/stream';

  static const String search = '/search';
  static const String playlists = '/playlists';
  static const String likedSongs = '/user/likes';
  static String toggleLike(String songId) => '/user/likes/$songId';
  static const String history = '/user/history';
  static const String settings = '/user/settings';
  static const String syncState = '/user/sync-state';
}

