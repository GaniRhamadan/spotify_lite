import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../player/services/audio_player_handler.dart';
import '../services/favorites_service.dart';
import 'liked_songs_screen.dart';

class LibraryScreen extends StatelessWidget {
  final AudioPlayerHandler audioHandler;

  const LibraryScreen({super.key, required this.audioHandler});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      children: [
        const Text(
          'Koleksi Kamu',
          style: TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 16),

        // 1. Tile: Lagu yang Disukai
        AnimatedBuilder(
          animation: FavoritesService(),
          builder: (context, _) {
            final count = FavoritesService().count;
            return ListTile(
              contentPadding: EdgeInsets.zero,
              leading: Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(6),
                  gradient: const LinearGradient(
                    colors: [Color(0xFF450AF5), Color(0xFFC4EFD9)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: const Icon(Icons.favorite_rounded, color: Colors.white, size: 28),
              ),
              title: const Text(
                'Lagu yang Disukai',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
              ),
              subtitle: Text(
                '$count Lagu Favorit',
                style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
              ),
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (context) => LikedSongsScreen(audioHandler: audioHandler),
                  ),
                );
              },
            );
          },
        ),
        const SizedBox(height: 12),

        // 2. Tile: Lagu Terunduh (Mode Offline)
        ListTile(
          contentPadding: EdgeInsets.zero,
          leading: Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(6),
              color: AppColors.surface,
              border: Border.all(color: AppColors.border),
            ),
            child: const Icon(Icons.download_done_rounded, color: AppColors.primary, size: 28),
          ),
          title: const Text(
            'Lagu Terunduh (Mode Offline)',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
          ),
          subtitle: const Text(
            'Putar tanpa kuota internet',
            style: TextStyle(color: AppColors.textSecondary, fontSize: 12),
          ),
          onTap: () {
            // Tampilkan lagu offline
          },
        ),
        const SizedBox(height: 12),

        // 3. Tile: Tambah Playlist Baru
        ListTile(
          contentPadding: EdgeInsets.zero,
          leading: Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(6),
              color: AppColors.elevated,
            ),
            child: const Icon(Icons.add, color: AppColors.textSecondary, size: 30),
          ),
          title: const Text(
            'Tambah Playlist Baru',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
          ),
          subtitle: const Text(
            'Buat koleksi lagu pribadi Anda',
            style: TextStyle(color: AppColors.textSecondary, fontSize: 12),
          ),
          onTap: () {
            // Dialog buat playlist
          },
        ),
      ],
    );
  }
}
