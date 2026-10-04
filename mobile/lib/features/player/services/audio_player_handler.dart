import 'package:flutter/foundation.dart';
import 'package:audio_service/audio_service.dart';
import 'package:audio_session/audio_session.dart';
import 'package:just_audio/just_audio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:wakelock_plus/wakelock_plus.dart';
import '../../../core/services/direct_music_service.dart';

/// Implementasi Engine Pemutar Musik Latar Belakang (Background Playback)
/// Mengintegrasikan just_audio dengan AudioService (Foreground Service Android & MediaSession)
class AudioPlayerHandler extends BaseAudioHandler with SeekHandler {
  final AudioPlayer _player = AudioPlayer();
  final List<MediaItem> _currentQueue = [];
  int _currentIndex = -1;

  DateTime _lastPositionBroadcast = DateTime.now();

  AudioPlayerHandler() {
    _initAudioSession();
    _listenToPlaybackState();
    _listenToCurrentPositionThrottled();
    _listenToSequenceState();
  }

  void _listenToCurrentPositionThrottled() {
    _player.positionStream.listen((pos) {
      final now = DateTime.now();
      // Throttle broadcast ke MediaSession/Notification maksimal 1 detik sekali
      // Ini menjaga Dynamic Island dan Kotak Musik HyperOS tetap hidup & bergerak
      // TANPA membuat HP lag (hanya 1 IPC per detik vs 50 per detik sebelumnya)
      if (now.difference(_lastPositionBroadcast).inMilliseconds >= 1000) {
        _lastPositionBroadcast = now;
        if (_player.playing) {
          playbackState.add(
            playbackState.value.copyWith(
              updatePosition: pos,
              bufferedPosition: _player.bufferedPosition,
            ),
          );
        }
      }
    });
  }

  Stream<Duration> get positionStream => _player.positionStream;
  Duration get position => _player.position;

  /// 1. Inisialisasi AudioSession (Fokus Audio & Headset Becoming Noisy)
  Future<void> _initAudioSession() async {
    final session = await AudioSession.instance;
    await session.configure(const AudioSessionConfiguration.music());

    // Tangani jika Headset / Bluetooth TWS dicabut mendadak (Becoming Noisy)
    session.becomingNoisyEventStream.listen((_) {
      pause(); // Otomatis jeda lagu agar tidak bocor ke speaker HP
    });

    // Tangani Interupsi Audio (Telepon Masuk & Suara Notifikasi / Ducking)
    session.interruptionEventStream.listen((event) {
      if (event.begin) {
        switch (event.type) {
          case AudioInterruptionType.duck:
            // Turunkan volume saat ada petunjuk suara GPS atau notifikasi
            _player.setVolume(0.3);
            break;
          case AudioInterruptionType.pause:
          case AudioInterruptionType.unknown:
            // Jeda pemutaran saat telepon berdering / masuk
            pause();
            break;
        }
      } else {
        switch (event.type) {
          case AudioInterruptionType.duck:
            // Kembalikan volume normal setelah suara notifikasi selesai
            _player.setVolume(1.0);
            break;
          case AudioInterruptionType.pause:
            // Lanjutkan pemutaran setelah panggilan telepon berakhir
            play();
            break;
          case AudioInterruptionType.unknown:
            break;
        }
      }
    });
  }

  /// 2. Menghubungkan Status Playback just_audio ke Android MediaStyle Notification
  void _listenToPlaybackState() {
    _player.playerStateStream.listen((_) => _broadcastPlaybackState());
  }

  void _broadcastPlaybackState() {
    final isPlaying = _player.playing;
    final processingState = _player.processingState;

    // Kelola WakeLock agar CPU tidak mati saat layar HP terkunci
    if (isPlaying) {
      WakelockPlus.enable();
    } else {
      WakelockPlus.disable();
    }

    playbackState.add(
      playbackState.value.copyWith(
        controls: [
          MediaControl.skipToPrevious,
          if (isPlaying) MediaControl.pause else MediaControl.play,
          MediaControl.skipToNext,
          MediaControl.stop,
        ],
        systemActions: const {
          MediaAction.seek,
          MediaAction.seekForward,
          MediaAction.seekBackward,
        },
        // Indeks kontrol yang tampil di compact view notifikasi Android (0, 1, 2)
        androidCompactActionIndices: const [0, 1, 2],
        processingState: _mapProcessingState(processingState),
        playing: isPlaying,
        updatePosition: _player.position,
        bufferedPosition: _player.bufferedPosition,
        speed: _player.speed,
      ),
    );
  }

  void _listenToSequenceState() {
    _player.playerStateStream.listen((state) {
      if (state.processingState == ProcessingState.completed) {
        skipToNext();
      }
    });
  }

  AudioProcessingState _mapProcessingState(ProcessingState state) {
    switch (state) {
      case ProcessingState.idle:
        return AudioProcessingState.idle;
      case ProcessingState.loading:
        return AudioProcessingState.loading;
      case ProcessingState.buffering:
        return AudioProcessingState.buffering;
      case ProcessingState.ready:
        return AudioProcessingState.ready;
      case ProcessingState.completed:
        return AudioProcessingState.completed;
    }
  }

  /// 3. Pemutaran Lagu Tunggal atau Antrean Baru
  Future<void> setQueueAndPlay(List<MediaItem> items, int initialIndex) async {
    _currentQueue.clear();
    _currentQueue.addAll(items);
    queue.add(_currentQueue);

    if (initialIndex >= 0 && initialIndex < _currentQueue.length) {
      _currentIndex = initialIndex;
      await _playItemAtIndex(_currentIndex);
    }
  }

  Future<void> _playItemAtIndex(int index) async {
    if (index < 0 || index >= _currentQueue.length) return;
    _currentIndex = index;
    final item = _currentQueue[index];
    mediaItem.add(item);
    _broadcastPlaybackState();

    String? streamUrl = item.extras?['url'] as String?;

    try {
      if (item.extras?['is_offline'] == true && streamUrl != null) {
        await _player.setFilePath(streamUrl);
      } else {
        // Direct Streaming: Dapatkan audio stream Google CDN langsung jika belum ada
        if (streamUrl == null || !streamUrl.contains('googlevideo.com')) {
          final directUrl = await DirectMusicService.instance.getStreamUrl(item.id);
          if (directUrl != null) {
            streamUrl = directUrl;
          }
        }

        if (streamUrl == null || streamUrl.isEmpty) {
          debugPrint('Tidak dapat menemukan URL stream untuk lagu: ${item.id}');
          return;
        }

        // Direct Streaming Audio M4A/AAC via ExoPlayer
        await _player.setUrl(streamUrl, preload: true);
      }

      if (_player.duration != null && _player.duration != item.duration) {
        final updatedItem = item.copyWith(duration: _player.duration);
        _currentQueue[index] = updatedItem;
        mediaItem.add(updatedItem);
      }

      await _player.play();
      _broadcastPlaybackState();

      // Simpan status terakhir ke SharedPreferences
      _saveLastState(item.id, index);
    } catch (e) {
      debugPrint('Gagal memutar audio: $e');
    }
  }

  Future<void> _saveLastState(String songId, int queueIndex) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('last_played_song_id', songId);
    await prefs.setInt('last_queue_index', queueIndex);
  }

  @override
  Future<void> play() => _player.play();

  @override
  Future<void> pause() => _player.pause();

  @override
  Future<void> stop() async {
    await _player.stop();
    await WakelockPlus.disable();
    await super.stop();
  }

  @override
  Future<void> seek(Duration position) async {
    await _player.seek(position);
    _broadcastPlaybackState();
  }

  @override
  Future<void> skipToNext() async {
    if (_currentQueue.isEmpty) return;
    if (_currentIndex + 1 < _currentQueue.length) {
      await _playItemAtIndex(_currentIndex + 1);
    } else {
      // Loop ke awal antrean
      await _playItemAtIndex(0);
    }
  }

  @override
  Future<void> skipToPrevious() async {
    if (_currentQueue.isEmpty) return;
    // Jika lagu sudah berjalan lebih dari 3 detik, restart lagu
    if (_player.position > const Duration(seconds: 3)) {
      await seek(Duration.zero);
      return;
    }
    if (_currentIndex - 1 >= 0) {
      await _playItemAtIndex(_currentIndex - 1);
    } else {
      await _playItemAtIndex(_currentQueue.length - 1);
    }
  }

  @override
  Future<void> setShuffleMode(AudioServiceShuffleMode shuffleMode) async {
    final enable = shuffleMode != AudioServiceShuffleMode.none;
    await _player.setShuffleModeEnabled(enable);
  }

  @override
  Future<void> setRepeatMode(AudioServiceRepeatMode repeatMode) async {
    switch (repeatMode) {
      case AudioServiceRepeatMode.none:
        await _player.setLoopMode(LoopMode.off);
        break;
      case AudioServiceRepeatMode.one:
        await _player.setLoopMode(LoopMode.one);
        break;
      case AudioServiceRepeatMode.all:
      case AudioServiceRepeatMode.group:
        await _player.setLoopMode(LoopMode.all);
        break;
    }
  }

  AudioPlayer get player => _player;
}
