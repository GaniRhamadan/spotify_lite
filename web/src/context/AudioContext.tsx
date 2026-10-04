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

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasRecordedHistoryRef = useRef<boolean>(false);

  // Inisialisasi audio element sekali saat mount
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.volume = volume;
    audioRef.current = audio;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      // Catat riwayat jika sudah diputar lebih dari 30 detik
      if (audio.currentTime > 30 && !hasRecordedHistoryRef.current && currentSong) {
        hasRecordedHistoryRef.current = true;
        apiRequest('/user/history', {
          method: 'POST',
          body: JSON.stringify({ songId: currentSong.id }),
        }).catch(() => {});
      }
    };

    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => handleSongEnded();

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
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

  const handleSongEnded = () => {
    if (repeatMode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else {
      nextSong();
    }
  };

  const playSong = (song: ISong, newQueue?: ISong[]) => {
    hasRecordedHistoryRef.current = false;
    let targetQueue = queue;

    if (newQueue && newQueue.length > 0) {
      targetQueue = newQueue;
      setQueue(newQueue);
    } else if (!queue.some(s => s.id === song.id)) {
      targetQueue = [song, ...queue];
      setQueue(targetQueue);
    }

    const idx = targetQueue.findIndex(s => s.id === song.id);
    setQueueIndex(idx !== -1 ? idx : 0);
    setCurrentSong(song);

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
    if (queue.length === 0) return;

    if (repeatMode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
      return;
    }

    let nextIdx = queueIndex + 1;
    if (isShuffle) {
      nextIdx = Math.floor(Math.random() * queue.length);
    } else if (nextIdx >= queue.length) {
      if (repeatMode === 'all') {
        nextIdx = 0;
      } else {
        return; // Akhir antrean
      }
    }

    const nextTrack = queue[nextIdx];
    if (nextTrack) {
      playSong(nextTrack, queue);
    }
  };

  const prevSong = () => {
    if (queue.length === 0) return;

    // Jika lagu sudah berjalan lebih dari 3 detik, restart lagu
    if (currentTime > 3) {
      seekTo(0);
      return;
    }

    let prevIdx = queueIndex - 1;
    if (prevIdx < 0) {
      prevIdx = repeatMode === 'all' ? queue.length - 1 : 0;
    }

    const prevTrack = queue[prevIdx];
    if (prevTrack) {
      playSong(prevTrack, queue);
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
