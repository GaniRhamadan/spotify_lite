import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { ISong } from '../types';
import { getStreamUrl, apiRequest } from '../services/api';

type RepeatMode = 'off' | 'all' | 'one';

interface AudioContextType {
  currentSong: ISong | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  queue: ISong[];
  queueIndex: number;
  isFullscreenOpen: boolean;
  fullscreenTab: 'cover' | 'video' | 'lyrics' | 'queue';
  setFullscreenTab: (tab: 'cover' | 'video' | 'lyrics' | 'queue') => void;
  playSong: (song: ISong, newQueue?: ISong[]) => void;
  togglePlayPause: () => void;
  nextSong: () => void;
  prevSong: () => void;
  seekTo: (seconds: number) => void;
  setVolume: (val: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  toggleLikeCurrentSong: () => Promise<void>;
  setIsFullscreenOpen: (open: boolean) => void;
  playbackError: string | null;
  clearPlaybackError: () => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentSong, setCurrentSong] = useState<ISong | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolumeState] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [queue, setQueue] = useState<ISong[]>([]);
  const [queueIndex, setQueueIndex] = useState<number>(0);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState<boolean>(false);
  const [fullscreenTab, setFullscreenTab] = useState<'cover' | 'video' | 'lyrics' | 'queue'>('cover');

  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasRecordedHistoryRef = useRef<boolean>(false);

  // Synchronous refs untuk menghindari stale closure di event listener audio
  const queueRef = useRef<ISong[]>(queue);
  const queueIndexRef = useRef<number>(queueIndex);
  const repeatModeRef = useRef<RepeatMode>(repeatMode);
  const isShuffleRef = useRef<boolean>(isShuffle);
  const currentSongRef = useRef<ISong | null>(currentSong);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    queueIndexRef.current = queueIndex;
  }, [queueIndex]);

  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  useEffect(() => {
    isShuffleRef.current = isShuffle;
  }, [isShuffle]);

  useEffect(() => {
    currentSongRef.current = currentSong;
  }, [currentSong]);

  // Inisialisasi audio element sekali saat mount
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.volume = volume;
    audioRef.current = audio;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      // Catat riwayat jika sudah diputar lebih dari 30 detik
      if (audio.currentTime > 30 && !hasRecordedHistoryRef.current && currentSongRef.current) {
        hasRecordedHistoryRef.current = true;
        apiRequest('/user/history', {
          method: 'POST',
          body: JSON.stringify({ songId: currentSongRef.current.id }),
        }).catch(() => {});
      }
    };

    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      setPlaybackError(null);
    };

    const onPlay = () => {
      setIsPlaying(true);
      setPlaybackError(null);
    };

    const onPause = () => setIsPlaying(false);

    const onEnded = () => {
      if (repeatModeRef.current === 'one') {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
        }
      } else {
        triggerNextSong();
      }
    };

    const onError = (e: Event) => {
      console.warn('Audio playback error encountered:', e);
      setIsPlaying(false);
      const failedSong = currentSongRef.current;
      setPlaybackError(`Gagal memutar "${failedSong?.title || 'lagu'}". Berkas audio tidak dapat diakses.`);

      // Fallback: jika lagu di antrean gagal dimuat, otomatis coba beralih ke lagu berikutnya
      const q = queueRef.current;
      if (q.length > 1) {
        setTimeout(() => {
          triggerNextSong();
        }, 1500);
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, []);

  // Update Media Session API browser
  useEffect(() => {
    if (!currentSong) return;

    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title,
        artist: currentSong.artist_name || 'Artis Spotify Lite',
        album: currentSong.album_title || 'Spotify Lite Single',
        artwork: [
          {
            src: currentSong.cover_url || 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=500',
            sizes: '512x512',
            type: 'image/jpeg',
          },
        ],
      });

      navigator.mediaSession.setActionHandler('play', () => togglePlayPause());
      navigator.mediaSession.setActionHandler('pause', () => togglePlayPause());
      navigator.mediaSession.setActionHandler('previoustrack', () => prevSong());
      navigator.mediaSession.setActionHandler('nexttrack', () => nextSong());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) seekTo(details.seekTime);
      });
    }
  }, [currentSong, isPlaying]);

  const triggerNextSong = () => {
    const q = queueRef.current;
    if (q.length === 0) return;

    const repMode = repeatModeRef.current;
    const shuffle = isShuffleRef.current;
    let nextIdx = queueIndexRef.current + 1;

    if (shuffle) {
      nextIdx = Math.floor(Math.random() * q.length);
    } else if (nextIdx >= q.length) {
      if (repMode === 'all') {
        nextIdx = 0;
      } else {
        setIsPlaying(false);
        return; // Akhir antrean
      }
    }

    const nextTrack = q[nextIdx];
    if (nextTrack) {
      playSong(nextTrack, q);
    }
  };

  const playSong = (song: ISong, newQueue?: ISong[]) => {
    hasRecordedHistoryRef.current = false;
    setPlaybackError(null);
    let targetQueue = queueRef.current;

    // Algoritma Rekomendasi: Catat frekuensi artis yang sering didengarkan user
    try {
      const artistName = (song.artist_name || '').trim();
      if (artistName && artistName !== 'Artis' && artistName !== 'Artis Tidak Diketahui') {
        const stored = JSON.parse(localStorage.getItem('listening_habits') || '{"artists":{}}');
        if (!stored.artists) stored.artists = {};
        stored.artists[artistName] = (stored.artists[artistName] || 0) + 1;
        localStorage.setItem('listening_habits', JSON.stringify(stored));
        window.dispatchEvent(new CustomEvent('listening_habits_updated'));
      }
    } catch {}

    if (newQueue && newQueue.length > 0) {
      targetQueue = newQueue;
      setQueue(newQueue);
      queueRef.current = newQueue;
    } else if (!targetQueue.some(s => s.id === song.id)) {
      targetQueue = [song, ...targetQueue];
      setQueue(targetQueue);
      queueRef.current = targetQueue;
    }

    const idx = targetQueue.findIndex(s => s.id === song.id);
    const validIdx = idx !== -1 ? idx : 0;
    setQueueIndex(validIdx);
    queueIndexRef.current = validIdx;

    setCurrentSong(song);
    currentSongRef.current = song;

    if (audioRef.current) {
      const streamUrl = getStreamUrl(song.id);
      audioRef.current.src = streamUrl;
      audioRef.current.play().catch(err => {
        console.warn('Playback error (biasanya karena autoplay browser restriction):', err);
      });
    }
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
  };

  const nextSong = () => {
    triggerNextSong();
  };

  const prevSong = () => {
    const q = queueRef.current;
    if (q.length === 0) return;

    if (audioRef.current && audioRef.current.currentTime > 3) {
      seekTo(0);
      return;
    }

    let prevIdx = queueIndexRef.current - 1;
    if (prevIdx < 0) {
      prevIdx = repeatModeRef.current === 'all' ? q.length - 1 : 0;
    }

    const prevTrack = q[prevIdx];
    if (prevTrack) {
      playSong(prevTrack, q);
    }
  };

  const seekTo = (seconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = seconds;
    setCurrentTime(seconds);
  };

  const setVolume = (val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    setVolumeState(clamped);
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : clamped;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audioRef.current.volume = nextMuted ? 0 : volume;
  };

  const toggleShuffle = () => setIsShuffle(!isShuffle);

  const toggleRepeat = () => {
    if (repeatMode === 'off') setRepeatMode('all');
    else if (repeatMode === 'all') setRepeatMode('one');
    else setRepeatMode('off');
  };

  const toggleLikeCurrentSong = async () => {
    if (!currentSong) return;
    try {
      const res = await apiRequest(`/user/likes/${currentSong.id}`, { method: 'POST' });
      if (res.success) {
        setCurrentSong({ ...currentSong, is_liked: res.is_liked });
      }
    } catch {}
  };

  return (
    <AudioContext.Provider
      value={{
        currentSong,
        isPlaying,
        currentTime,
        duration,
        volume,
        isMuted,
        isShuffle,
        repeatMode,
        queue,
        queueIndex,
        isFullscreenOpen,
        fullscreenTab,
        setFullscreenTab,
        playSong,
        togglePlayPause,
        nextSong,
        prevSong,
        seekTo,
        setVolume,
        toggleMute,
        toggleShuffle,
        toggleRepeat,
        toggleLikeCurrentSong,
        setIsFullscreenOpen,
        playbackError,
        clearPlaybackError: () => setPlaybackError(null),
      }}
    >
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) throw new Error('useAudio harus digunakan di dalam AudioProvider');
  return context;
};
