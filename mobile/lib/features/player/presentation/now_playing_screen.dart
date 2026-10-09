import 'package:flutter/material.dart';
import 'package:audio_service/audio_service.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:youtube_player_iframe/youtube_player_iframe.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/services/direct_music_service.dart';
import '../services/audio_player_handler.dart';
import '../models/song_model.dart';
import '../../library/services/favorites_service.dart';
import 'karaoke_lyrics_sheet.dart';

class NowPlayingScreen extends StatefulWidget {
  final AudioPlayerHandler audioHandler;

  const NowPlayingScreen({super.key, required this.audioHandler});

  @override
  State<NowPlayingScreen> createState() => _NowPlayingScreenState();
}

class _NowPlayingScreenState extends State<NowPlayingScreen> {
  bool _isShuffle = false;
  AudioServiceRepeatMode _repeatMode = AudioServiceRepeatMode.none;

  // State untuk Pemutar Video YouTube (Menggantikan Kotak Banner)
  bool _isVideoMode = false;
  YoutubePlayerController? _ytController;
  String? _loadedVideoId;
  bool _isLoadingVideo = false;
  String? _videoError;
  String? _lastTrackId;

  @override
  void dispose() {
    _ytController?.close();
    super.dispose();
  }

  String _formatDuration(Duration d) {
    final minutes = d.inMinutes;
    final seconds = d.inSeconds % 60;
    return '$minutes:${seconds < 10 ? '0' : ''}$seconds';
  }

  void _initOrUpdateVideo(String videoId) {
    if (_loadedVideoId == videoId && _ytController != null) return;
    _loadedVideoId = videoId;

    _ytController ??= YoutubePlayerController(
      params: const YoutubePlayerParams(
        showControls: true,
        showFullscreenButton: true,
        mute: false,
        showVideoAnnotations: false,
        enableCaption: true,
      ),
    );
    _ytController!.loadVideoById(videoId: videoId);
  }

  Future<void> _toggleVideoMode(MediaItem item) async {
    if (_isVideoMode) {
      // 1. Matikan Mode Video & Kembali ke Musik / Cover
      _ytController?.pauseVideo();
      await widget.audioHandler.play();
      if (mounted) {
        setState(() {
          _isVideoMode = false;
          _videoError = null;
        });
      }
    } else {
      // 2. Aktifkan Mode Video & Jeda Audio Musik agar tidak bentrok suara
      await widget.audioHandler.pause();
      if (mounted) {
        setState(() {
          _isVideoMode = true;
          _isLoadingVideo = true;
          _videoError = null;
        });
      }

      try {
        String? videoId;
        if (item.id.startsWith('yt_')) {
          videoId = item.id.replaceFirst('yt_', '');
        } else {
          // Fallback cari video YouTube jika ID lagu lokal/database
          final searchList = await DirectMusicService.instance.searchSongs(
            '${item.title} ${item.artist ?? ""}',
            limit: 3,
          );
          if (searchList.isNotEmpty) {
            videoId = searchList.first.id.replaceFirst('yt_', '');
          }
        }

        if (videoId != null && videoId.isNotEmpty) {
          _initOrUpdateVideo(videoId);
          if (mounted) {
            setState(() {
              _isLoadingVideo = false;
            });
          }
        } else {
          if (mounted) {
            setState(() {
              _isLoadingVideo = false;
              _videoError = 'Video tidak ditemukan untuk lagu ini.';
            });
          }
        }
      } catch (e) {
        if (mounted) {
          setState(() {
            _isLoadingVideo = false;
            _videoError = 'Gagal memuat video: $e';
          });
        }
      }
    }
  }

  void _showKaraokeLyricsSheet(BuildContext context, MediaItem item) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) {
        return DraggableScrollableSheet(
          initialChildSize: 0.8,
          minChildSize: 0.45,
          maxChildSize: 0.95,
          expand: false,
          builder: (context, scrollController) {
            return KaraokeLyricsSheet(
              item: item,
              audioHandler: widget.audioHandler,
            );
          },
        );
      },
    );
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

        // Jika lagu berganti saat mode video aktif, muat video baru
        if (_lastTrackId != mediaItem.id) {
          _lastTrackId = mediaItem.id;
          if (_isVideoMode) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (mounted) {
                _toggleVideoMode(mediaItem);
              }
            });
          }
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
                              style: TextStyle(
                                color: AppColors.textSecondary,
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 1,
                              ),
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

                    // 1.5. Segmented Pill Switcher (Lagu vs Video)
                    Container(
                      margin: const EdgeInsets.only(top: 8, bottom: 4),
                      padding: const EdgeInsets.all(3),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.5),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: Colors.white12),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          InkWell(
                            onTap: () {
                              if (_isVideoMode) _toggleVideoMode(mediaItem);
                            },
                            borderRadius: BorderRadius.circular(16),
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 200),
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
                              decoration: BoxDecoration(
                                color: !_isVideoMode ? Colors.white : Colors.transparent,
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    Icons.music_note_rounded,
                                    size: 14,
                                    color: !_isVideoMode ? Colors.black : Colors.white70,
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    'Lagu',
                                    style: TextStyle(
                                      color: !_isVideoMode ? Colors.black : Colors.white70,
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          InkWell(
                            onTap: () {
                              if (!_isVideoMode) _toggleVideoMode(mediaItem);
                            },
                            borderRadius: BorderRadius.circular(16),
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 200),
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
                              decoration: BoxDecoration(
                                color: _isVideoMode ? Colors.redAccent.shade700 : Colors.transparent,
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    Icons.smart_display_rounded,
                                    size: 14,
                                    color: _isVideoMode ? Colors.white : Colors.redAccent,
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    'Video',
                                    style: TextStyle(
                                      color: _isVideoMode ? Colors.white : Colors.white70,
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    // 2. Kotak Banner / Pemutar Video YouTube (Berganti saat Mode Video Aktif)
                    Container(
                      width: double.infinity,
                      constraints: const BoxConstraints(maxHeight: 320),
                      margin: const EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                            color: _isVideoMode
                                ? Colors.red.withValues(alpha: 0.3)
                                : Colors.black.withValues(alpha: 0.6),
                            blurRadius: 25,
                            offset: const Offset(0, 10),
                          ),
                        ],
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(16),
                        child: _isVideoMode
                            ? _buildVideoPlayerContainer(mediaItem)
                            : _buildCoverArtContainer(mediaItem),
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

                    // 3.5. Tombol Pintas Mode Video & Lirik Lagu
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          // Tombol Mode Video
                          _isVideoMode
                              ? ElevatedButton.icon(
                                  onPressed: () => _toggleVideoMode(mediaItem),
                                  icon: const Icon(Icons.music_note_rounded, size: 16, color: Colors.white),
                                  label: const Text(
                                    'Kembali ke Musik',
                                    style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                                  ),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: Colors.redAccent.shade700,
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                                  ),
                                )
                              : OutlinedButton.icon(
                                  onPressed: () => _toggleVideoMode(mediaItem),
                                  icon: const Icon(Icons.smart_display_rounded, size: 16, color: Colors.redAccent),
                                  label: const Text('Mode Video', style: TextStyle(color: Colors.white, fontSize: 12)),
                                  style: OutlinedButton.styleFrom(
                                    side: const BorderSide(color: Colors.white24),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                  ),
                                ),

                          const SizedBox(width: 12),

                          // Tombol Lirik Lagu Karaoke Interaktif
                          ElevatedButton.icon(
                            onPressed: () => _showKaraokeLyricsSheet(context, mediaItem),
                            icon: const Icon(Icons.mic_external_on_rounded, size: 16, color: Colors.black),
                            label: const Text(
                              'Lirik Lagu',
                              style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 12),
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primary,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                            ),
                          ),
                        ],
                      ),
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
                                if (_isVideoMode) {
                                  // Jika mode video aktif, kontrol pemutar video
                                  if (_ytController != null) {
                                    // toggle video play / pause
                                    _ytController!.playerState.then((state) {
                                      if (state == PlayerState.playing) {
                                        _ytController!.pauseVideo();
                                      } else {
                                        _ytController!.playVideo();
                                      }
                                    });
                                  }
                                } else {
                                  if (isPlaying) {
                                    widget.audioHandler.pause();
                                  } else {
                                    widget.audioHandler.play();
                                  }
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

  /// Tampilan Kotak Cover Art Standar (Mode Musik)
  Widget _buildCoverArtContainer(MediaItem mediaItem) {
    return AspectRatio(
      aspectRatio: 1,
      child: Stack(
        fit: StackFit.expand,
        children: [
          CachedNetworkImage(
            imageUrl: mediaItem.artUri?.toString() ?? '',
            fit: BoxFit.cover,
            errorWidget: (_, __, ___) => Container(
              color: AppColors.card,
              child: const Icon(Icons.music_note, size: 80, color: Colors.white),
            ),
          ),
          // Badge cepat untuk nonton video YouTube langsung
          Positioned(
            bottom: 12,
            right: 12,
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: () => _toggleVideoMode(mediaItem),
                borderRadius: BorderRadius.circular(20),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.75),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Colors.white24),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.play_circle_fill_rounded, color: Colors.redAccent, size: 16),
                      SizedBox(width: 4),
                      Text(
                        'Tonton Video',
                        style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Tampilan Pemutar Video YouTube Asli (Mode Video YouTube / Anime)
  Widget _buildVideoPlayerContainer(MediaItem mediaItem) {
    return AspectRatio(
      aspectRatio: 16 / 9,
      child: Container(
        color: Colors.black,
        child: Stack(
          alignment: Alignment.center,
          children: [
            if (_ytController != null && !_isLoadingVideo && _videoError == null)
              YoutubePlayer(
                controller: _ytController!,
                aspectRatio: 16 / 9,
              ),

            if (_isLoadingVideo)
              const Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    CircularProgressIndicator(color: AppColors.primary),
                    SizedBox(height: 12),
                    Text(
                      'Menyiapkan Video YouTube...',
                      style: TextStyle(color: Colors.white70, fontSize: 12),
                    ),
                  ],
                ),
              ),

            if (_videoError != null)
              Padding(
                padding: const EdgeInsets.all(16),
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.smart_display_outlined, color: Colors.redAccent, size: 40),
                      const SizedBox(height: 8),
                      Text(
                        _videoError!,
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: Colors.white70, fontSize: 12),
                      ),
                      const SizedBox(height: 10),
                      ElevatedButton(
                        onPressed: () => _toggleVideoMode(mediaItem),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.white12,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        ),
                        child: const Text('Coba Lagi', style: TextStyle(color: Colors.white, fontSize: 11)),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
