import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/services/direct_music_service.dart';
import '../../player/models/song_model.dart';
import '../../player/services/audio_player_handler.dart';
import '../services/favorites_service.dart';

enum SortMode { newest, oldest, titleAsc, artistAsc }

class LikedSongsScreen extends StatefulWidget {
  final AudioPlayerHandler audioHandler;

  const LikedSongsScreen({super.key, required this.audioHandler});

  @override
  State<LikedSongsScreen> createState() => _LikedSongsScreenState();
}

class _LikedSongsScreenState extends State<LikedSongsScreen> {
  final FavoritesService _favoritesService = FavoritesService();
  SortMode _currentSort = SortMode.newest;
  bool _isLoadingRecommendations = false;

  @override
  void initState() {
    super.initState();
    _favoritesService.addListener(_onFavoritesChanged);
  }

  @override
  void dispose() {
    _favoritesService.removeListener(_onFavoritesChanged);
    super.dispose();
  }

  void _onFavoritesChanged() {
    if (mounted) setState(() {});
  }

  List<SongModel> _getSortedSongs() {
    final songs = List<SongModel>.from(_favoritesService.favoriteSongs);
    switch (_currentSort) {
      case SortMode.newest:
        // Default: urut dari atas / baru ditambahkan
        break;
      case SortMode.oldest:
        return songs.reversed.toList();
      case SortMode.titleAsc:
        songs.sort((a, b) => a.title.toLowerCase().compareTo(b.title.toLowerCase()));
        break;
      case SortMode.artistAsc:
        songs.sort((a, b) => a.artistName.toLowerCase().compareTo(b.artistName.toLowerCase()));
        break;
    }
    return songs;
  }

  String _formatDuration(int seconds) {
    final m = seconds ~/ 60;
    final s = seconds % 60;
    return '$m:${s < 10 ? '0' : ''}$s';
  }

  /// 1. Putar Otomatis dari Lagu Teratas
  void _playFromTop() {
    final songs = _getSortedSongs();
    if (songs.isEmpty) return;
    final items = songs.map((s) => s.toMediaItem()).toList();
    widget.audioHandler.setQueueAndPlay(items, 0);
  }

  /// 2. Putar Otomatis Secara Acak (Shuffle & Auto-Play)
  void _playShuffled() {
    final songs = List<SongModel>.from(_favoritesService.favoriteSongs)..shuffle();
    if (songs.isEmpty) return;
    final items = songs.map((s) => s.toMediaItem()).toList();
    widget.audioHandler.setQueueAndPlay(items, 0);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('🔀 Memutar lagu favorit secara acak!'),
        duration: Duration(seconds: 2),
        backgroundColor: AppColors.card,
      ),
    );
  }

  /// 3. Rekomendasi Sesuai Tema Lagu & Putar Otomatis (Smart Recommendation & Auto-Play)
  Future<void> _playSmartRecommendations() async {
    final favorites = _favoritesService.favoriteSongs;
    if (favorites.isEmpty) return;

    setState(() => _isLoadingRecommendations = true);

    try {
      // Ambil artis atau tema dari lagu favorit yang ada
      final sampleSong = (favorites..shuffle()).first;
      final query = sampleSong.artistName.isNotEmpty ? sampleSong.artistName : sampleSong.title;

      List<SongModel> recommendedSongs = await DirectMusicService.instance.searchSongs('Lagu mirip $query', limit: 20);
      if (recommendedSongs.isEmpty) {
        recommendedSongs = await DirectMusicService.instance.getTrendingSongs();
      }

      if (recommendedSongs.isNotEmpty && mounted) {
        final items = recommendedSongs.map((s) => s.toMediaItem()).toList();
        // Langsung ter-play otomatis lagu pertama!
        widget.audioHandler.setQueueAndPlay(items, 0);

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('✨ Memutar playlist rekomendasi tema: "${sampleSong.artistName}"!'),
            duration: const Duration(seconds: 3),
            backgroundColor: AppColors.primary,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Gagal memuat rekomendasi: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoadingRecommendations = false);
    }
  }

  void _showSortDialog() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Urutkan Lagu Berdasarkan', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              ListTile(
                leading: const Icon(Icons.arrow_downward_rounded, color: Colors.white),
                title: const Text('Menyusun dari Atas (Baru Ditambahkan)', style: TextStyle(color: Colors.white)),
                trailing: _currentSort == SortMode.newest ? const Icon(Icons.check, color: AppColors.primary) : null,
                onTap: () {
                  setState(() => _currentSort = SortMode.newest);
                  Navigator.pop(context);
                },
              ),
              ListTile(
                leading: const Icon(Icons.arrow_upward_rounded, color: Colors.white),
                title: const Text('Lagu Terlama Ditambahkan', style: TextStyle(color: Colors.white)),
                trailing: _currentSort == SortMode.oldest ? const Icon(Icons.check, color: AppColors.primary) : null,
                onTap: () {
                  setState(() => _currentSort = SortMode.oldest);
                  Navigator.pop(context);
                },
              ),
              ListTile(
                leading: const Icon(Icons.sort_by_alpha_rounded, color: Colors.white),
                title: const Text('Judul Lagu (A ke Z)', style: TextStyle(color: Colors.white)),
                trailing: _currentSort == SortMode.titleAsc ? const Icon(Icons.check, color: AppColors.primary) : null,
                onTap: () {
                  setState(() => _currentSort = SortMode.titleAsc);
                  Navigator.pop(context);
                },
              ),
              ListTile(
                leading: const Icon(Icons.person_rounded, color: Colors.white),
                title: const Text('Nama Artis (A ke Z)', style: TextStyle(color: Colors.white)),
                trailing: _currentSort == SortMode.artistAsc ? const Icon(Icons.check, color: AppColors.primary) : null,
                onTap: () {
                  setState(() => _currentSort = SortMode.artistAsc);
                  Navigator.pop(context);
                },
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final songs = _getSortedSongs();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.sort_rounded, color: Colors.white),
            tooltip: 'Urutkan',
            onPressed: _showSortDialog,
          ),
        ],
      ),
      body: songs.isEmpty
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 80,
                      height: 80,
                      decoration: const BoxDecoration(
                        shape: BoxShape.circle,
                        color: AppColors.surface,
                      ),
                      child: const Icon(Icons.favorite_border_rounded, size: 44, color: AppColors.textSecondary),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Belum Ada Lagu Favorit',
                      style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Ketuk ikon hati (Love) di lagu apa saja untuk menyimpannya ke koleksi favorit ini!',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
                    ),
                  ],
                ),
              ),
            )
          : ListView(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              children: [
                // Header Koleksi Favorit
                Row(
                  children: [
                    Container(
                      width: 110,
                      height: 110,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(10),
                        gradient: const LinearGradient(
                          colors: [Color(0xFF450AF5), Color(0xFFC4EFD9)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF450AF5).withValues(alpha: 0.4),
                            blurRadius: 16,
                            offset: const Offset(0, 6),
                          ),
                        ],
                      ),
                      child: const Icon(Icons.favorite_rounded, color: Colors.white, size: 54),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Lagu yang Disukai',
                            style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            '${songs.length} Lagu Tersimpan',
                            style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'Putar offline & online',
                            style: TextStyle(color: AppColors.primary, fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 20),

                // Bar Tombol Aksi: Play Utama, Shuffle, dan Rekomendasi Tema
                Row(
                  children: [
                    // 1. Tombol Play Hijau Bulat Besar (Langsung Play dari Atas)
                    GestureDetector(
                      onTap: _playFromTop,
                      child: Container(
                        width: 52,
                        height: 52,
                        decoration: const BoxDecoration(
                          color: AppColors.primary,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.play_arrow_rounded, color: Colors.black, size: 36),
                      ),
                    ),
                    const SizedBox(width: 14),

                    // 2. Tombol Acak / Shuffle (Langsung Play Otomatis)
                    IconButton(
                      icon: const Icon(Icons.shuffle_rounded, color: Colors.white, size: 28),
                      tooltip: 'Acak & Putar Otomatis',
                      onPressed: _playShuffled,
                    ),

                    // 3. Tombol Rekomendasi Sesuai Tema (Smart Theme Radio)
                    ElevatedButton.icon(
                      onPressed: _isLoadingRecommendations ? null : _playSmartRecommendations,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.surface,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      ),
                      icon: _isLoadingRecommendations
                          ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary))
                          : const Icon(Icons.auto_awesome_rounded, color: AppColors.primary, size: 18),
                      label: const Text('Rekomendasi Tema', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                    ),

                    const Spacer(),

                    // Tombol Atur Susunan
                    IconButton(
                      icon: const Icon(Icons.filter_list_rounded, color: AppColors.textSecondary),
                      onPressed: _showSortDialog,
                    ),
                  ],
                ),

                const SizedBox(height: 12),
                const Divider(color: AppColors.border),
                const SizedBox(height: 8),

                // Daftar Lagu Favorit
                ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: songs.length,
                  itemBuilder: (context, index) {
                    final song = songs[index];
                    return ListTile(
                      contentPadding: const EdgeInsets.symmetric(vertical: 2),
                      leading: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          SizedBox(
                            width: 24,
                            child: Text(
                              '${index + 1}',
                              style: const TextStyle(color: AppColors.textSecondary, fontSize: 13, fontWeight: FontWeight.bold),
                              textAlign: TextAlign.center,
                            ),
                          ),
                          const SizedBox(width: 8),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(4),
                            child: CachedNetworkImage(
                              imageUrl: song.coverUrl ?? '',
                              width: 48,
                              height: 48,
                              fit: BoxFit.cover,
                              errorWidget: (_, __, ___) => Container(
                                width: 48,
                                height: 48,
                                color: AppColors.card,
                                child: const Icon(Icons.music_note, color: Colors.white),
                              ),
                            ),
                          ),
                        ],
                      ),
                      title: Text(
                        song.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                      subtitle: Text(
                        song.artistName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                      ),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.favorite_rounded, color: AppColors.primary, size: 22),
                            onPressed: () async {
                              await _favoritesService.toggleFavorite(song);
                            },
                          ),
                          Text(
                            _formatDuration(song.durationSeconds),
                            style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                          ),
                        ],
                      ),
                      onTap: () {
                        // Putar langsung lagu yang dipilih dalam antrean favorit
                        final items = songs.map((s) => s.toMediaItem()).toList();
                        widget.audioHandler.setQueueAndPlay(items, index);
                      },
                    );
                  },
                ),
                const SizedBox(height: 80),
              ],
            ),
    );
  }
}
