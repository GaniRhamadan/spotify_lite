import 'package:flutter/material.dart';
import 'package:audio_service/audio_service.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../core/constants/app_colors.dart';
import '../services/audio_player_handler.dart';
import '../models/song_model.dart';
import '../../library/services/favorites_service.dart';

class NowPlayingScreen extends StatefulWidget {
  final AudioPlayerHandler audioHandler;

  const NowPlayingScreen({super.key, required this.audioHandler});

  @override
  State<NowPlayingScreen> createState() => _NowPlayingScreenState();
}

class _NowPlayingScreenState extends State<NowPlayingScreen> {
  bool _isShuffle = false;
  AudioServiceRepeatMode _repeatMode = AudioServiceRepeatMode.none;

  String _formatDuration(Duration d) {
    final minutes = d.inMinutes;
    final seconds = d.inSeconds % 60;
    return '$minutes:${seconds < 10 ? '0' : ''}$seconds';
  }

  void _showQueueBottomSheet(BuildContext context, List<MediaItem> queue, MediaItem current) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Container(
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Antrean Lagu',
                style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              Expanded(
                child: ListView.builder(
                  itemCount: queue.length,
                  itemBuilder: (context, index) {
                    final item = queue[index];
                    final isCurrent = item.id == current.id;
                    return ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: CachedNetworkImage(
                          imageUrl: item.artUri?.toString() ?? '',
                          width: 44,
                          height: 44,
                          fit: BoxFit.cover,
                          errorWidget: (_, __, ___) => const Icon(Icons.music_note),
                        ),
                      ),
                      title: Text(
                        item.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: isCurrent ? AppColors.primary : Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                      subtitle: Text(
                        item.artist ?? '',
                        style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                      ),
                      trailing: Text(
                        _formatDuration(item.duration ?? Duration.zero),
                        style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                      ),
                      onTap: () {
                        widget.audioHandler.setQueueAndPlay(queue, index);
                        Navigator.pop(context);
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<MediaItem?>(
      stream: widget.audioHandler.mediaItem,
      builder: (context, mediaSnapshot) {
        final mediaItem = mediaSnapshot.data;
        if (mediaItem == null) {
          return const Scaffold(
            backgroundColor: AppColors.background,
            body: Center(child: Text('Tidak ada lagu yang sedang diputar')),
          );
        }

        return Scaffold(
          backgroundColor: AppColors.background,
          body: Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFF382347), AppColors.background],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
            ),
            child: SafeArea(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // 1. Top Bar
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.keyboard_arrow_down_rounded, size: 32, color: Colors.white),
                          onPressed: () => Navigator.pop(context),
                        ),
                        Column(
                          children: [
                            const Text(
                              'MEMUTAR DARI KATALOG',
                              style: TextStyle(color: AppColors.textSecondary, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1),
                            ),
                            Text(
                              mediaItem.album ?? 'Spotify Lite',
                              style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                        StreamBuilder<List<MediaItem>>(
                          stream: widget.audioHandler.queue,
                          builder: (context, qSnap) {
                            final queue = qSnap.data ?? [];
                            return IconButton(
                              icon: const Icon(Icons.queue_music_rounded, color: Colors.white),
                              onPressed: () => _showQueueBottomSheet(context, queue, mediaItem),
                            );
                          },
                        ),
                      ],
                    ),

                    // 2. Cover Art Besar
                    Container(
                      width: double.infinity,
                      constraints: const BoxConstraints(maxHeight: 320),
                      margin: const EdgeInsets.symmetric(vertical: 24),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.6),
                            blurRadius: 25,
                            offset: const Offset(0, 10),
                          ),
                        ],
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(16),
                        child: AspectRatio(
                          aspectRatio: 1,
                          child: CachedNetworkImage(
                            imageUrl: mediaItem.artUri?.toString() ?? '',
                            fit: BoxFit.cover,
                            errorWidget: (_, __, ___) => Container(
                              color: AppColors.card,
                              child: const Icon(Icons.music_note, size: 80, color: Colors.white),
                            ),
                          ),
                        ),
                      ),
                    ),

                    // 3. Judul, Artis, dan Like
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                mediaItem.title,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 22,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                mediaItem.artist ?? 'Artis',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  color: AppColors.textSecondary,
                                  fontSize: 16,
                                ),
                              ),
                            ],
                          ),
                        ),
                        AnimatedBuilder(
                          animation: FavoritesService(),
                          builder: (context, _) {
                            final isLiked = FavoritesService().isFavorite(mediaItem.id);
                            return IconButton(
                              icon: Icon(
                                isLiked ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                                color: isLiked ? AppColors.primary : Colors.white70,
                                size: 28,
                              ),
                              onPressed: () async {
                                final song = SongModel(
                                  id: mediaItem.id,
                                  title: mediaItem.title,
                                  artistId: '',
                                  artistName: mediaItem.artist ?? 'Artis',
                                  albumTitle: mediaItem.album,
                                  durationSeconds: mediaItem.duration?.inSeconds ?? 0,
                                  coverUrl: mediaItem.artUri?.toString(),
                                );
                                final added = await FavoritesService().toggleFavorite(song);
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).clearSnackBars();
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text(
                                        added
                                            ? '❤️ Ditambahkan ke Lagu yang Disukai'
                                            : '🤍 Dihapus dari Lagu yang Disukai',
                                        style: const TextStyle(fontWeight: FontWeight.bold),
                                      ),
                                      duration: const Duration(seconds: 2),
                                      backgroundColor: added ? AppColors.primary : AppColors.card,
                                      behavior: SnackBarBehavior.floating,
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                    ),
                                  );
                                }
                              },
                            );
                          },
                        ),
                      ],
                    ),

                    // 4. Seek Slider
                    StreamBuilder<Duration>(
                      stream: widget.audioHandler.positionStream,
                      builder: (context, posSnap) {
                        final position = posSnap.data ?? widget.audioHandler.position;
                        final duration = mediaItem.duration ?? Duration.zero;

                        final maxMs = duration.inMilliseconds.toDouble();
                        final curMs = position.inMilliseconds.toDouble().clamp(0.0, maxMs > 0 ? maxMs : 1.0);

                        return Column(
                          children: [
                            Slider(
                              value: curMs,
                              max: maxMs > 0 ? maxMs : 1.0,
                              onChanged: (val) {
                                widget.audioHandler.seek(Duration(milliseconds: val.toInt()));
                              },
                            ),
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    _formatDuration(position),
                                    style: const TextStyle(color: AppColors.textSecondary, fontSize: 11),
                                  ),
                                  Text(
                                    _formatDuration(duration),
                                    style: const TextStyle(color: AppColors.textSecondary, fontSize: 11),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        );
                      },
                    ),

                    // 5. Tombol Kontrol Utama
                    StreamBuilder<PlaybackState>(
                      stream: widget.audioHandler.playbackState,
                      builder: (context, stateSnap) {
                        final isPlaying = stateSnap.data?.playing ?? false;

                        return Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            // Shuffle
                            IconButton(
                              icon: Icon(
                                Icons.shuffle_rounded,
                                color: _isShuffle ? AppColors.primary : AppColors.textSecondary,
                              ),
                              onPressed: () {
                                setState(() => _isShuffle = !_isShuffle);
                                widget.audioHandler.setShuffleMode(
                                  _isShuffle ? AudioServiceShuffleMode.all : AudioServiceShuffleMode.none,
                                );
                              },
                            ),

                            // Prev
                            IconButton(
                              icon: const Icon(Icons.skip_previous_rounded, size: 38, color: Colors.white),
                              onPressed: () => widget.audioHandler.skipToPrevious(),
                            ),

                            // Play / Pause Utama
                            GestureDetector(
                              onTap: () {
                                if (isPlaying) {
                                  widget.audioHandler.pause();
                                } else {
                                  widget.audioHandler.play();
                                }
                              },
                              child: Container(
                                width: 68,
                                height: 68,
                                decoration: const BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: Colors.white,
                                ),
                                child: Icon(
                                  isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded,
                                  size: 40,
                                  color: Colors.black,
                                ),
                              ),
                            ),

                            // Next
                            IconButton(
                              icon: const Icon(Icons.skip_next_rounded, size: 38, color: Colors.white),
                              onPressed: () => widget.audioHandler.skipToNext(),
                            ),

                            // Repeat
                            IconButton(
                              icon: Icon(
                                _repeatMode == AudioServiceRepeatMode.one
                                    ? Icons.repeat_one_rounded
                                    : Icons.repeat_rounded,
                                color: _repeatMode != AudioServiceRepeatMode.none
                                    ? AppColors.primary
                                    : AppColors.textSecondary,
                              ),
                              onPressed: () {
                                setState(() {
                                  if (_repeatMode == AudioServiceRepeatMode.none) {
                                    _repeatMode = AudioServiceRepeatMode.all;
                                  } else if (_repeatMode == AudioServiceRepeatMode.all) {
                                    _repeatMode = AudioServiceRepeatMode.one;
                                  } else {
                                    _repeatMode = AudioServiceRepeatMode.none;
                                  }
                                });
                                widget.audioHandler.setRepeatMode(_repeatMode);
                              },
                            ),
                          ],
                        );
                      },
                    ),

                    const SizedBox(height: 8),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
