import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:audio_service/audio_service.dart';
import 'core/constants/api_endpoints.dart';
import 'core/theme/app_theme.dart';
import 'core/constants/app_colors.dart';
import 'features/player/services/audio_player_handler.dart';
import 'features/player/presentation/mini_player.dart';
import 'features/home/presentation/home_screen.dart';
import 'features/search/presentation/search_screen.dart';
import 'features/library/presentation/library_screen.dart';
import 'features/library/services/favorites_service.dart';
import 'features/settings/presentation/settings_screen.dart';

late AudioPlayerHandler _audioHandler;

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // 1. Inisialisasi konfigurasi server URL dinamis & Koleksi Favorit
  await ApiEndpoints.init();
  await FavoritesService().init();

  // 2. Inisialisasi AudioService Foreground Engine untuk Android
  try {
    _audioHandler = await AudioService.init(
      builder: () => AudioPlayerHandler(),
      config: const AudioServiceConfig(
        androidNotificationChannelId: 'com.example.spotify_lite.channel.audio',
        androidNotificationChannelName: 'Pemutar Musik Spotify Lite',
        androidNotificationChannelDescription: 'Menampilkan kontrol musik di notifikasi dan layar kunci',
        androidNotificationOngoing: true,
        androidStopForegroundOnPause: true,
        androidShowNotificationBadge: true,
        androidNotificationIcon: 'mipmap/ic_launcher',
      ),
    );
  } catch (e, stack) {
    debugPrint('AudioService.init error fallback: $e\n$stack');
    _audioHandler = AudioPlayerHandler();
  }

  runApp(
    const ProviderScope(
      child: SpotifyLiteApp(),
    ),
  );
}

class SpotifyLiteApp extends StatelessWidget {
  const SpotifyLiteApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Spotify Lite',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      home: MainNavigationContainer(audioHandler: _audioHandler),
    );
  }
}

class MainNavigationContainer extends StatefulWidget {
  final AudioPlayerHandler audioHandler;

  const MainNavigationContainer({super.key, required this.audioHandler});

  @override
  State<MainNavigationContainer> createState() => _MainNavigationContainerState();
}

class _MainNavigationContainerState extends State<MainNavigationContainer> {
  int _currentIndex = 0;

  late final List<Widget> _pages;

  @override
  void initState() {
    super.initState();
    _pages = [
      HomeScreen(audioHandler: widget.audioHandler),
      SearchScreen(audioHandler: widget.audioHandler),
      LibraryScreen(audioHandler: widget.audioHandler),
      const SettingsScreen(),
    ];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: IndexedStack(
          index: _currentIndex,
          children: _pages,
        ),
      ),
      bottomNavigationBar: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Mini Player Melayang di Atas Navigasi
          MiniPlayer(audioHandler: widget.audioHandler),

          // Bar Navigasi Bawah Khas Spotify
          BottomNavigationBar(
            currentIndex: _currentIndex,
            onTap: (index) => setState(() => _currentIndex = index),
            items: const [
              BottomNavigationBarItem(
                icon: Icon(Icons.home_filled),
                label: 'Beranda',
              ),
              BottomNavigationBarItem(
                icon: Icon(Icons.search_rounded),
                label: 'Cari',
              ),
              BottomNavigationBarItem(
                icon: Icon(Icons.library_music_rounded),
                label: 'Koleksi',
              ),
              BottomNavigationBarItem(
                icon: Icon(Icons.settings_rounded),
                label: 'Pengaturan',
              ),
            ],
          ),
        ],
      ),
    );
  }
}
