import 'dart:async';
import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:dio/dio.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/api_client.dart';
import '../../../core/services/direct_music_service.dart';
import '../../player/models/song_model.dart';
import '../../player/services/audio_player_handler.dart';
import '../../library/services/favorites_service.dart';

class SearchScreen extends StatefulWidget {
  final AudioPlayerHandler audioHandler;

  const SearchScreen({super.key, required this.audioHandler});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final TextEditingController _searchCtrl = TextEditingController();
  Timer? _debounceTimer;
  List<SongModel> _results = [];
  bool _isSearching = false;

  void _onSearchChanged(String query) {
    _debounceTimer?.cancel();
    if (query.trim().isEmpty) {
      setState(() => _results = []);
      return;
    }

    _debounceTimer = Timer(const Duration(milliseconds: 300), () async {
      setState(() => _isSearching = true);
      try {
        final trimmed = query.trim();
        List<SongModel> backendSongs = [];
        try {
          final res = await ApiClient().dio.get(
            ApiEndpoints.search,
            queryParameters: {'q': trimmed},
            options: Options(
              sendTimeout: const Duration(milliseconds: 2500),
              receiveTimeout: const Duration(milliseconds: 2500),
            ),
          );
          if (res.statusCode == 200 && res.data != null && res.data['success'] == true) {
            final rawSongs = (res.data['data']?['songs'] as List?) ?? [];
            backendSongs = rawSongs.map((s) => SongModel.fromJson(s as Map<String, dynamic>)).toList();
          }
        } catch (backendErr) {
          debugPrint('Backend search fallback: $backendErr');
        }

        // Cari direct juga jika backend kosong atau sedikit
        List<SongModel> directSongs = [];
        if (backendSongs.isEmpty || backendSongs.length < 5) {
          try {
            directSongs = await DirectMusicService.instance.searchSongs(trimmed);
          } catch (e) {
            debugPrint('Error direct music search: $e');
          }
        }

        // Gabungkan tanpa duplikasi ID
        final combined = <SongModel>[...backendSongs];
        final existingIds = backendSongs.map((s) => s.id).toSet();
        for (final ds in directSongs) {
          if (!existingIds.contains(ds.id)) {
            combined.add(ds);
          }
        }

        if (mounted) {
          setState(() {
            _results = combined;
          });
        }
      } catch (e) {
        debugPrint('Error pencarian: $e');
      } finally {
        if (mounted) {
          setState(() => _isSearching = false);
        }
      }
    });
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Cari',
            style: TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 12),

          // Search Field
          TextField(
            controller: _searchCtrl,
            onChanged: _onSearchChanged,
            style: const TextStyle(color: Colors.white, fontSize: 14),
            decoration: InputDecoration(
              hintText: 'Artis, lagu, atau album...',
              hintStyle: const TextStyle(color: AppColors.textSecondary, fontSize: 14),
              prefixIcon: const Icon(Icons.search_rounded, color: Colors.white),
              filled: true,
              fillColor: AppColors.surface,
              contentPadding: const EdgeInsets.symmetric(vertical: 12),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide.none,
              ),
            ),
          ),

          const SizedBox(height: 16),

          if (_isSearching)
            const Center(child: Padding(padding: EdgeInsets.all(20), child: CircularProgressIndicator(color: AppColors.primary)))
          else if (_searchCtrl.text.isNotEmpty && _results.isEmpty)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(32),
                child: Text('Tidak ada hasil ditemukan', style: TextStyle(color: AppColors.textSecondary)),
              ),
            )
          else
            Expanded(
              child: ListView.builder(
                itemCount: _results.length,
                itemBuilder: (context, index) {
                  final song = _results[index];
                  return ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: CachedNetworkImage(
                        imageUrl: song.coverUrl ?? '',
                        width: 46,
                        height: 46,
                        fit: BoxFit.cover,
                        errorWidget: (_, __, ___) => Container(
                          width: 46,
                          height: 46,
                          color: AppColors.card,
                          child: const Icon(Icons.music_note, color: Colors.white),
                        ),
                      ),
                    ),
                    title: Text(
                      song.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 14),
                    ),
                    subtitle: Text(
                      song.artistName,
                      style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                    ),
                    trailing: AnimatedBuilder(
                      animation: FavoritesService(),
                      builder: (context, _) {
                        final isLiked = FavoritesService().isFavorite(song.id);
                        return IconButton(
                          icon: Icon(
                            isLiked ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                            color: isLiked ? AppColors.primary : AppColors.textSecondary,
                            size: 22,
                          ),
                          onPressed: () async {
                            await FavoritesService().toggleFavorite(song);
                          },
                        );
                      },
                    ),
                    onTap: () {
                      final items = _results.map((s) => s.toMediaItem()).toList();
                      widget.audioHandler.setQueueAndPlay(items, index);
                    },
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}
