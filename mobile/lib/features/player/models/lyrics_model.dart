/// Model baris lirik yang sudah diparsing
class ParsedLyricLine {
  final Duration time;
  final String text;
  final int stanzaIndex; // Bait ke berapa (1-based: 1, 2, 3...)
  final int lineIndex; // Baris ke berapa di dalam bait (1-based)
  final int globalIndex; // Urutan baris global di seluruh lagu (0-based)

  const ParsedLyricLine({
    required this.time,
    required this.text,
    required this.stanzaIndex,
    required this.lineIndex,
    required this.globalIndex,
  });
}

/// Model Bait / Stanza lirik
class LyricStanza {
  final int stanzaIndex; // Bait ke berapa (1, 2, 3...)
  final String label; // e.g. "Bait 1", "Bait 2", "Refrein / Chorus"
  final List<ParsedLyricLine> lines;
  final Duration startTime;
  final Duration endTime;

  const LyricStanza({
    required this.stanzaIndex,
    required this.label,
    required this.lines,
    required this.startTime,
    required this.endTime,
  });
}

/// Kontainer data lirik lagu lengkap
class LyricsData {
  final List<LyricStanza> stanzas;
  final List<ParsedLyricLine> allLines;
  final bool isSynced;
  final String? rawLyrics;
  final String source;

  const LyricsData({
    required this.stanzas,
    required this.allLines,
    required this.isSynced,
    this.rawLyrics,
    this.source = 'lrclib',
  });

  static LyricsData empty() {
    return const LyricsData(
      stanzas: [],
      allLines: [],
      isSynced: false,
      source: 'none',
    );
  }

  bool get isEmpty => allLines.isEmpty;
  bool get isNotEmpty => allLines.isNotEmpty;
}
