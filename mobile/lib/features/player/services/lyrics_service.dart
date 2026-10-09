import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../../../core/constants/api_endpoints.dart';
import '../models/lyrics_model.dart';

/// Layanan Pengambilan dan Pemformatan Lirik Lagu Karaoke (Synced & Plain)
class LyricsService {
  static final LyricsService instance = LyricsService._internal();
  LyricsService._internal();

  final Dio _dio = Dio(
    BaseOptions(
      connectTimeout: const Duration(seconds: 6),
      receiveTimeout: const Duration(seconds: 8),
      headers: {'User-Agent': 'SpotifyLite/1.0 (Android Mobile)'},
    ),
  );

  // Cache lirik di memori
  final Map<String, LyricsData> _cache = {};

  static final RegExp _metaRegex = RegExp(
    r'^\[(ti|ar|al|by|offset|length|re|ve):',
    caseSensitive: false,
  );
  static final RegExp _timeRegex = RegExp(r'\[(\d{2}):(\d{2}(?:\.\d+)?)\]');
  static final RegExp _sectionHeaderRegex = RegExp(
    r'^(\[|\()?(Verse|Chorus|Reff|Refrein|Pre-Chorus|Bridge|Outro|Intro|Bait|Hook|Interlude|Drop|Solo)\b.*(\]|\))?$',
    caseSensitive: false,
  );

  /// Ambil lirik lagu dengan prioritas: Cache -> Backend Server -> Fallback LRCLIB Publik
  Future<LyricsData> getLyrics({
    required String songId,
    required String title,
    String? artist,
  }) async {
    // 1. Cek cache memori
    if (_cache.containsKey(songId)) {
      return _cache[songId]!;
    }

    // Bersihkan judul dari embel-embel "(Official Video)", dll.
    final cleanTitle = _cleanSongTitle(title);
    final cleanArtist = (artist ?? '').trim();

    // 2. Coba ambil dari Backend Server
    try {
      final backendUrl = '${ApiEndpoints.baseUrl}/songs/$songId/lyrics';
      final response = await _dio.get(
        backendUrl,
        queryParameters: {
          'title': cleanTitle,
          'artist': cleanArtist,
        },
      );

      if (response.statusCode == 200 && response.data?['data'] != null) {
        final data = response.data['data'];
        final synced = data['syncedLyrics'] as String?;
        final plain = data['lyrics'] as String?;
        final source = (data['source'] as String?) ?? 'backend';

        if ((synced != null && synced.trim().isNotEmpty) || (plain != null && plain.trim().isNotEmpty)) {
          final parsed = parseLyrics(syncedLyrics: synced, plainLyrics: plain, source: source);
          if (parsed.isNotEmpty) {
            _cache[songId] = parsed;
            return parsed;
          }
        }
      }
    } catch (e) {
      debugPrint('Backend lyrics lookup failed for $songId: $e. Mencoba LRCLIB langsung...');
    }

    // 3. Fallback: Cari langsung ke LRCLIB Publik jika backend tidak menemukan
    try {
      const lrclibGetUrl = 'https://lrclib.net/api/get';
      final res = await _dio.get(
        lrclibGetUrl,
        queryParameters: {
          'track_name': cleanTitle,
          'artist_name': cleanArtist,
        },
      );

      if (res.statusCode == 200 && res.data != null) {
        final synced = res.data['syncedLyrics'] as String?;
        final plain = res.data['plainLyrics'] as String? ?? res.data['lyrics'] as String?;
        if ((synced != null && synced.trim().isNotEmpty) || (plain != null && plain.trim().isNotEmpty)) {
          final parsed = parseLyrics(syncedLyrics: synced, plainLyrics: plain, source: 'lrclib_direct');
          if (parsed.isNotEmpty) {
            _cache[songId] = parsed;
            return parsed;
          }
        }
      }
    } catch (_) {
      // Coba pencarian query luas di LRCLIB
      try {
        const searchUrl = 'https://lrclib.net/api/search';
        final searchRes = await _dio.get(
          searchUrl,
          queryParameters: {'q': '$cleanTitle $cleanArtist'.trim()},
        );
        if (searchRes.statusCode == 200 && searchRes.data is List && (searchRes.data as List).isNotEmpty) {
          final item = (searchRes.data as List).first;
          final synced = item['syncedLyrics'] as String?;
          final plain = item['plainLyrics'] as String? ?? item['lyrics'] as String?;
          if ((synced != null && synced.trim().isNotEmpty) || (plain != null && plain.trim().isNotEmpty)) {
            final parsed = parseLyrics(syncedLyrics: synced, plainLyrics: plain, source: 'lrclib_search');
            if (parsed.isNotEmpty) {
              _cache[songId] = parsed;
              return parsed;
            }
          }
        }
      } catch (err) {
        debugPrint('LRCLIB search fallback failed: $err');
      }
    }

    final empty = LyricsData.empty();
    _cache[songId] = empty;
    return empty;
  }

  /// Parsing dan pemformatan teks lirik menjadi Bait / Stanza yang rapi
  LyricsData parseLyrics({
    String? syncedLyrics,
    String? plainLyrics,
    String source = 'lrclib',
  }) {
    if (syncedLyrics != null && syncedLyrics.contains(_timeRegex)) {
      return _parseSynced(syncedLyrics, source);
    } else if (plainLyrics != null && plainLyrics.trim().isNotEmpty) {
      return _parsePlain(plainLyrics, source);
    }
    return LyricsData.empty();
  }

  LyricsData _parseSynced(String lrc, String source) {
    final rawLines = lrc.split('\n');
    final List<Map<String, dynamic>> rawTimedEntries = [];

    for (final raw in rawLines) {
      final line = raw.trim();
      if (line.isEmpty || _metaRegex.hasMatch(line)) continue;

      final matches = _timeRegex.allMatches(line).toList();
      if (matches.isEmpty) continue;

      final text = _cleanText(line.replaceAll(_timeRegex, ''));

      for (final m in matches) {
        final min = int.tryParse(m.group(1) ?? '0') ?? 0;
        final sec = double.tryParse(m.group(2) ?? '0') ?? 0.0;
        final duration = Duration(milliseconds: (min * 60000 + sec * 1000).round());
        rawTimedEntries.add({
          'time': duration,
          'text': text,
        });
      }
    }

    rawTimedEntries.sort((a, b) => (a['time'] as Duration).compareTo(b['time'] as Duration));

    final List<LyricStanza> stanzas = [];
    final List<ParsedLyricLine> allLines = [];
    List<ParsedLyricLine> currentLines = [];
    int stanzaCounter = 1;
    String currentLabel = 'Bait 1';

    for (int i = 0; i < rawTimedEntries.length; i++) {
      final entry = rawTimedEntries[i];
      final time = entry['time'] as Duration;
      final text = entry['text'] as String;

      // Cek apakah baris ini adalah nama section seperti "[Chorus]" atau "(Reff)"
      if (_sectionHeaderRegex.hasMatch(text)) {
        if (currentLines.isNotEmpty) {
          stanzas.add(LyricStanza(
            stanzaIndex: stanzaCounter,
            label: currentLabel,
            lines: List.from(currentLines),
            startTime: currentLines.first.time,
            endTime: currentLines.last.time,
          ));
          stanzaCounter++;
          currentLines = [];
        }
        currentLabel = _formatSectionLabel(text, stanzaCounter);
        continue;
      }

      // Baris kosong menandakan jeda bait
      if (text.isEmpty) {
        if (currentLines.isNotEmpty) {
          stanzas.add(LyricStanza(
            stanzaIndex: stanzaCounter,
            label: currentLabel,
            lines: List.from(currentLines),
            startTime: currentLines.first.time,
            endTime: currentLines.last.time,
          ));
          stanzaCounter++;
          currentLabel = 'Bait $stanzaCounter';
          currentLines = [];
        }
        continue;
      }

      // Jeda instrumental panjang antar baris (> 5.5 detik) menandakan perpindahan bait
      if (currentLines.isNotEmpty) {
        final lastTime = currentLines.last.time;
        if (time.inMilliseconds - lastTime.inMilliseconds > 5500) {
          stanzas.add(LyricStanza(
            stanzaIndex: stanzaCounter,
            label: currentLabel,
            lines: List.from(currentLines),
            startTime: currentLines.first.time,
            endTime: currentLines.last.time,
          ));
          stanzaCounter++;
          currentLabel = 'Bait $stanzaCounter';
          currentLines = [];
        }
      }

      final parsedLine = ParsedLyricLine(
        time: time,
        text: text,
        stanzaIndex: stanzaCounter,
        lineIndex: currentLines.length + 1,
        globalIndex: allLines.length,
      );

      currentLines.add(parsedLine);
      allLines.add(parsedLine);
    }

    if (currentLines.isNotEmpty) {
      stanzas.add(LyricStanza(
        stanzaIndex: stanzaCounter,
        label: currentLabel,
        lines: List.from(currentLines),
        startTime: currentLines.first.time,
        endTime: currentLines.last.time,
      ));
    }

    return LyricsData(
      stanzas: stanzas,
      allLines: allLines,
      isSynced: true,
      rawLyrics: lrc,
      source: source,
    );
  }

  LyricsData _parsePlain(String plain, String source) {
    final rawLines = plain.split('\n');
    final List<LyricStanza> stanzas = [];
    final List<ParsedLyricLine> allLines = [];
    List<ParsedLyricLine> currentLines = [];
    int stanzaCounter = 1;
    String currentLabel = 'Bait 1';

    for (final raw in rawLines) {
      final text = _cleanText(raw);

      if (_sectionHeaderRegex.hasMatch(text)) {
        if (currentLines.isNotEmpty) {
          stanzas.add(LyricStanza(
            stanzaIndex: stanzaCounter,
            label: currentLabel,
            lines: List.from(currentLines),
            startTime: Duration.zero,
            endTime: Duration.zero,
          ));
          stanzaCounter++;
          currentLines = [];
        }
        currentLabel = _formatSectionLabel(text, stanzaCounter);
        continue;
      }

      if (text.isEmpty) {
        if (currentLines.isNotEmpty) {
          stanzas.add(LyricStanza(
            stanzaIndex: stanzaCounter,
            label: currentLabel,
            lines: List.from(currentLines),
            startTime: Duration.zero,
            endTime: Duration.zero,
          ));
          stanzaCounter++;
          currentLabel = 'Bait $stanzaCounter';
          currentLines = [];
        }
      } else {
        final parsed = ParsedLyricLine(
          time: Duration.zero,
          text: text,
          stanzaIndex: stanzaCounter,
          lineIndex: currentLines.length + 1,
          globalIndex: allLines.length,
        );
        currentLines.add(parsed);
        allLines.add(parsed);
      }
    }

    if (currentLines.isNotEmpty) {
      stanzas.add(LyricStanza(
        stanzaIndex: stanzaCounter,
        label: currentLabel,
        lines: List.from(currentLines),
        startTime: Duration.zero,
        endTime: Duration.zero,
      ));
    }

    return LyricsData(
      stanzas: stanzas,
      allLines: allLines,
      isSynced: false,
      rawLyrics: plain,
      source: source,
    );
  }

  static String _cleanText(String input) {
    return input
        .replaceAll('&amp;', '&')
        .replaceAll('&quot;', '"')
        .replaceAll('&#39;', "'")
        .replaceAll('&apos;', "'")
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
  }

  static String _cleanSongTitle(String title) {
    return title
        .replaceAll(RegExp(r'\(Official.*?\)', caseSensitive: false), '')
        .replaceAll(RegExp(r'\[Official.*?\]', caseSensitive: false), '')
        .replaceAll(RegExp(r'\(Lyric.*?\)', caseSensitive: false), '')
        .replaceAll(RegExp(r'\[Lyric.*?\]', caseSensitive: false), '')
        .replaceAll(RegExp(r'\(Audio.*?\)', caseSensitive: false), '')
        .replaceAll(RegExp(r'\[Audio.*?\]', caseSensitive: false), '')
        .replaceAll(RegExp(r'\(Video.*?\)', caseSensitive: false), '')
        .replaceAll(RegExp(r'\[Video.*?\]', caseSensitive: false), '')
        .replaceAll(RegExp(r'FULL EPISODE\s*\|\s*', caseSensitive: false), '')
        .replaceAll(RegExp(r'Episode\s*\d+', caseSensitive: false), '')
        .trim();
  }

  static String _formatSectionLabel(String raw, int defaultNumber) {
    final clean = raw.replaceAll(RegExp(r'[\[\]\(\)]'), '').trim();
    if (clean.toLowerCase().contains('chorus') || clean.toLowerCase().contains('reff')) {
      return 'Refrein (Reff)';
    }
    if (clean.toLowerCase().contains('bridge')) {
      return 'Jembatan (Bridge)';
    }
    if (clean.toLowerCase().contains('pre-chorus')) {
      return 'Pra-Refrein';
    }
    if (clean.toLowerCase().contains('outro')) {
      return 'Bagian Penutup (Outro)';
    }
    if (clean.toLowerCase().contains('intro')) {
      return 'Bagian Pembuka (Intro)';
    }
    return clean.isNotEmpty ? clean : 'Bait $defaultNumber';
  }
}
