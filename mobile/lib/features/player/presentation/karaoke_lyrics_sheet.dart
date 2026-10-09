import 'dart:async';
import 'package:flutter/material.dart';
import 'package:audio_service/audio_service.dart';
import '../../../core/constants/app_colors.dart';
import '../services/audio_player_handler.dart';
import '../services/lyrics_service.dart';
import '../models/lyrics_model.dart';

/// Modal Layar Penuh Lirik Lagu Karaoke Interaktif
/// Menampilkan penanda Bait ke berapa, baris aktif, auto-scroll, dan tap-to-seek
class KaraokeLyricsSheet extends StatefulWidget {
  final MediaItem item;
  final AudioPlayerHandler audioHandler;

  const KaraokeLyricsSheet({
    super.key,
    required this.item,
    required this.audioHandler,
  });

  @override
  State<KaraokeLyricsSheet> createState() => _KaraokeLyricsSheetState();
}

class _KaraokeLyricsSheetState extends State<KaraokeLyricsSheet> {
  final ScrollController _scrollController = ScrollController();
  final Map<int, GlobalKey> _lineKeys = {};

  LyricsData? _lyricsData;
  bool _isLoading = true;
  String? _errorMessage;

  bool _isAutoScrollEnabled = true;
  Timer? _userScrollDebounce;
  int _lastActiveLineIndex = -1;
  double _fontSizeScale = 1.0; // 0.9, 1.0, 1.15, 1.3

  @override
  void initState() {
    super.initState();
    _fetchLyrics();
  }

  @override
  void dispose() {
    _userScrollDebounce?.cancel();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _fetchLyrics() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final data = await LyricsService.instance.getLyrics(
        songId: widget.item.id,
        title: widget.item.title,
        artist: widget.item.artist,
      );

      if (mounted) {
        setState(() {
          _lyricsData = data;
          _isLoading = false;
          if (data.isEmpty) {
            _errorMessage = 'Lirik belum tersedia untuk lagu ini.';
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = 'Gagal memuat lirik: $e';
        });
      }
    }
  }

  void _onUserScrolled() {
    // Jika pengguna menggulir manual, nonaktifkan auto-scroll sementara selama 4 detik
    if (!_isAutoScrollEnabled) return;

    _userScrollDebounce?.cancel();
    _userScrollDebounce = Timer(const Duration(seconds: 4), () {
      if (mounted) {
        setState(() => _isAutoScrollEnabled = true);
      }
    });
  }

  void _scrollToActiveLine(int globalIndex) {
    if (!_isAutoScrollEnabled) return;
    final key = _lineKeys[globalIndex];
    if (key == null) return;

    final context = key.currentContext;
    if (context != null) {
      Scrollable.ensureVisible(
        context,
        duration: const Duration(milliseconds: 350),
        curve: Curves.easeInOutCubic,
        alignment: 0.35, // Posisikan sekitar sepertiga dari atas layar
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Color(0xFF120E1C),
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // 1. Handle Bar & Drag Indicator
          Padding(
            padding: const EdgeInsets.only(top: 12, bottom: 8),
            child: Center(
              child: Container(
                width: 44,
                height: 5,
                decoration: BoxDecoration(
                  color: Colors.white24,
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
            ),
          ),

          // 2. Header Kontrol & Status Lirik
          _buildHeader(),

          const Divider(color: Colors.white12, height: 1),

          // 3. Body Lirik
          Expanded(
            child: _buildBody(),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Info Lagu & Judul Lirik
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Text(
                      'Lirik Lagu',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(width: 8),
                    if (_lyricsData != null && _lyricsData!.isSynced)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: AppColors.primary.withValues(alpha: 0.4)),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.sync_rounded, color: AppColors.primary, size: 12),
                            SizedBox(width: 4),
                            Text(
                              'KARAOKE SYNC',
                              style: TextStyle(
                                color: AppColors.primary,
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  '${widget.item.title} • ${widget.item.artist ?? ""}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                ),
              ],
            ),
          ),

          // Kontrol Font & Auto-Scroll
          Row(
            children: [
              // Tombol Ukuran Huruf (A- / A+)
              IconButton(
                icon: const Icon(Icons.format_size_rounded, color: Colors.white70, size: 20),
                tooltip: 'Ubah Ukuran Huruf',
                onPressed: () {
                  setState(() {
                    if (_fontSizeScale == 1.0) {
                      _fontSizeScale = 1.18;
                    } else if (_fontSizeScale == 1.18) {
                      _fontSizeScale = 1.35;
                    } else if (_fontSizeScale == 1.35) {
                      _fontSizeScale = 0.9;
                    } else {
                      _fontSizeScale = 1.0;
                    }
                  });
                },
              ),

              // Tombol Auto-Scroll
              if (_lyricsData != null && _lyricsData!.isSynced)
                IconButton(
                  icon: Icon(
                    _isAutoScrollEnabled ? Icons.my_location_rounded : Icons.location_searching_rounded,
                    color: _isAutoScrollEnabled ? AppColors.primary : Colors.white38,
                    size: 20,
                  ),
                  tooltip: _isAutoScrollEnabled ? 'Auto-Scroll Aktif' : 'Pusatkan ke Baris Lagu',
                  onPressed: () {
                    setState(() => _isAutoScrollEnabled = true);
                    if (_lastActiveLineIndex >= 0) {
                      _scrollToActiveLine(_lastActiveLineIndex);
                    }
                  },
                ),

              // Tombol Tutup
              IconButton(
                icon: const Icon(Icons.close_rounded, color: Colors.white70, size: 22),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(color: AppColors.primary),
            SizedBox(height: 16),
            Text(
              'Menyelaraskan lirik karaoke...',
              style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
            ),
          ],
        ),
      );
    }

    if (_errorMessage != null || _lyricsData == null || _lyricsData!.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.lyrics_outlined, size: 56, color: Colors.white24),
              const SizedBox(height: 16),
              Text(
                _errorMessage ?? 'Belum ada lirik untuk lagu ini.',
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppColors.textSecondary, fontSize: 14),
              ),
              const SizedBox(height: 20),
              ElevatedButton.icon(
                onPressed: _fetchLyrics,
                icon: const Icon(Icons.refresh_rounded, size: 16, color: Colors.black),
                label: const Text('Cari Ulang Lirik', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                ),
              ),
            ],
          ),
        ),
      );
    }

    final data = _lyricsData!;

    if (!data.isSynced) {
      // Tampilan Lirik Polos (Plain Lyrics) yang sudah dirapikan per Bait
      return _buildPlainLyricsView(data);
    }

    // Tampilan Lirik Karaoke Tersinkronisasi Real-Time
    return StreamBuilder<Duration>(
      stream: widget.audioHandler.positionStream,
      builder: (context, snapshot) {
        final currentPosition = snapshot.data ?? widget.audioHandler.position;

        // Cari baris dan bait yang sedang aktif
        int activeGlobalIndex = -1;
        for (int i = 0; i < data.allLines.length; i++) {
          if (currentPosition >= data.allLines[i].time) {
            activeGlobalIndex = i;
          } else {
            break;
          }
        }

        // Auto-scroll jika baris berubah
        if (activeGlobalIndex != _lastActiveLineIndex) {
          _lastActiveLineIndex = activeGlobalIndex;
          WidgetsBinding.instance.addPostFrameCallback((_) {
            _scrollToActiveLine(activeGlobalIndex);
          });
        }

        final activeLine = activeGlobalIndex >= 0 ? data.allLines[activeGlobalIndex] : null;
        final activeStanzaIndex = activeLine?.stanzaIndex ?? (data.stanzas.isNotEmpty ? 1 : 0);

        return NotificationListener<ScrollNotification>(
          onNotification: (scrollInfo) {
            if (scrollInfo is UserScrollNotification) {
              _onUserScrolled();
            }
            return false;
          },
          child: Column(
            children: [
              // Banner Status: Penanda Bait ke berapa yang sedang dimainkan
              _buildStanzaStatusBar(
                activeStanzaIndex: activeStanzaIndex,
                totalStanzas: data.stanzas.length,
                activeLine: activeLine,
              ),

              // Daftar Bait & Baris Lirik
              Expanded(
                child: ListView.builder(
                  controller: _scrollController,
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                  itemCount: data.stanzas.length,
                  itemBuilder: (context, sIdx) {
                    final stanza = data.stanzas[sIdx];
                    final isCurrentStanza = stanza.stanzaIndex == activeStanzaIndex;

                    return _buildStanzaBlock(
                      stanza: stanza,
                      isCurrentStanza: isCurrentStanza,
                      activeGlobalIndex: activeGlobalIndex,
                      isSynced: true,
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

  /// Banner penanda bait ke berapa & status baris yang sedang dimainkan
  Widget _buildStanzaStatusBar({
    required int activeStanzaIndex,
    required int totalStanzas,
    required ParsedLyricLine? activeLine,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFF191428),
        border: Border(
          bottom: BorderSide(color: Colors.white.withValues(alpha: 0.08)),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.primary,
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primary.withValues(alpha: 0.6),
                      blurRadius: 6,
                      spreadRadius: 2,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Text(
                'Sedang di Bait ke-$activeStanzaIndex dari $totalStanzas',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                ),
              ),
            ],
          ),
          if (activeLine != null)
            Text(
              'Baris ke-${activeLine.lineIndex}',
              style: const TextStyle(
                color: AppColors.textSecondary,
                fontSize: 12,
                fontFamily: 'monospace',
              ),
            ),
        ],
      ),
    );
  }

  /// Blok Bait (Stanza) yang membungkus baris-baris lirik secara rapi
  Widget _buildStanzaBlock({
    required LyricStanza stanza,
    required bool isCurrentStanza,
    required int activeGlobalIndex,
    required bool isSynced,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 24),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: isCurrentStanza && isSynced
            ? AppColors.primary.withValues(alpha: 0.07)
            : Colors.white.withValues(alpha: 0.03),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isCurrentStanza && isSynced
              ? AppColors.primary.withValues(alpha: 0.35)
              : Colors.white.withValues(alpha: 0.06),
          width: isCurrentStanza && isSynced ? 1.5 : 1.0,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Penanda Bait
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: isCurrentStanza && isSynced
                        ? AppColors.primary
                        : Colors.white.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    isCurrentStanza && isSynced
                        ? '▶ SEDANG AKTIF: ${stanza.label.toUpperCase()}'
                        : stanza.label.toUpperCase(),
                    style: TextStyle(
                      color: isCurrentStanza && isSynced ? Colors.black : Colors.white70,
                      fontWeight: FontWeight.bold,
                      fontSize: 10,
                      letterSpacing: 0.8,
                    ),
                  ),
                ),
                Text(
                  '${stanza.lines.length} Baris',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.35),
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),

          // Baris-baris Lirik dalam Bait ini
          ...stanza.lines.map((line) {
            final isLineActive = isSynced && line.globalIndex == activeGlobalIndex;
            _lineKeys[line.globalIndex] ??= GlobalKey();

            return _buildLyricLineItem(
              line: line,
              isActive: isLineActive,
              isSynced: isSynced,
              key: _lineKeys[line.globalIndex],
            );
          }),
        ],
      ),
    );
  }

  /// Item satu baris teks lirik dengan styling karaoke & tap-to-seek
  Widget _buildLyricLineItem({
    required ParsedLyricLine line,
    required bool isActive,
    required bool isSynced,
    Key? key,
  }) {
    final baseFontSize = (isActive ? 19.0 : 16.0) * _fontSizeScale;

    return Container(
      key: key,
      margin: const EdgeInsets.symmetric(vertical: 4),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(10),
          onTap: isSynced
              ? () {
                  widget.audioHandler.seek(line.time);
                }
              : null,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 250),
            padding: EdgeInsets.symmetric(
              horizontal: 12,
              vertical: isActive ? 10 : 6,
            ),
            decoration: BoxDecoration(
              color: isActive
                  ? AppColors.primary.withValues(alpha: 0.18)
                  : Colors.transparent,
              borderRadius: BorderRadius.circular(10),
              border: isActive
                  ? Border.all(color: AppColors.primary.withValues(alpha: 0.4), width: 1)
                  : null,
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Indikator Baris Aktif (Panah Hijau)
                if (isSynced)
                  Padding(
                    padding: const EdgeInsets.only(top: 2, right: 10),
                    child: Icon(
                      isActive ? Icons.play_arrow_rounded : Icons.fiber_manual_record_rounded,
                      size: isActive ? 18 : 6,
                      color: isActive ? AppColors.primary : Colors.white24,
                    ),
                  ),

                // Teks Lirik
                Expanded(
                  child: Text(
                    line.text,
                    style: TextStyle(
                      color: isActive ? AppColors.primary : Colors.white70,
                      fontSize: baseFontSize,
                      fontWeight: isActive ? FontWeight.w800 : FontWeight.w600,
                      height: 1.5,
                      letterSpacing: 0.2,
                      shadows: isActive
                          ? [
                              Shadow(
                                color: AppColors.primary.withValues(alpha: 0.5),
                                blurRadius: 10,
                              ),
                            ]
                          : null,
                    ),
                  ),
                ),

                // Indikator Waktu Lirik (Kecil di Kanan)
                if (isSynced && isActive)
                  Padding(
                    padding: const EdgeInsets.only(top: 3, left: 6),
                    child: Text(
                      _formatDuration(line.time),
                      style: const TextStyle(
                        color: AppColors.primary,
                        fontSize: 10,
                        fontFamily: 'monospace',
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  /// Tampilan Lirik Polos (Plain) jika lirik tidak memiliki timestamp
  Widget _buildPlainLyricsView(LyricsData data) {
    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      itemCount: data.stanzas.length,
      itemBuilder: (context, idx) {
        final stanza = data.stanzas[idx];
        return _buildStanzaBlock(
          stanza: stanza,
          isCurrentStanza: false,
          activeGlobalIndex: -1,
          isSynced: false,
        );
      },
    );
  }

  String _formatDuration(Duration d) {
    final minutes = d.inMinutes;
    final seconds = d.inSeconds % 60;
    return '$minutes:${seconds < 10 ? '0' : ''}$seconds';
  }
}
