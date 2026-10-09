import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Heart,
  ListMusic,
  FileText,
  Video,
  Music2,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { useAudio } from '../context/AudioContext';
import { apiRequest } from '../services/api';

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

interface SyncedLine {
  time: number;
  text: string;
  stanzaIndex: number;
  lineIndex: number;
  globalIndex: number;
}

interface StanzaGroup {
  stanzaIndex: number;
  label: string;
  lines: SyncedLine[];
}

interface PlainStanza {
  stanzaIndex: number;
  label: string;
  lines: string[];
}

export const FullscreenPlayer: React.FC = () => {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    isShuffle,
    repeatMode,
    queue,
    isFullscreenOpen,
    fullscreenTab,
    setFullscreenTab,
    togglePlayPause,
    nextSong,
    prevSong,
    seekTo,
    toggleShuffle,
    toggleRepeat,
    toggleLikeCurrentSong,
    setIsFullscreenOpen,
    playSong,
  } = useAudio();

  const [syncedLines, setSyncedLines] = useState<SyncedLine[]>([]);
  const [stanzas, setStanzas] = useState<StanzaGroup[]>([]);
  const [plainStanzas, setPlainStanzas] = useState<PlainStanza[]>([]);
  const [plainLyrics, setPlainLyrics] = useState<string | null>(null);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const [activeLineIndex, setActiveLineIndex] = useState<number>(-1);

  const lyricsContainerRef = useRef<HTMLDivElement | null>(null);
  const activeLineRef = useRef<HTMLParagraphElement | null>(null);

  // Ambil YouTube Video ID
  const ytVideoId = currentSong?.id.startsWith('yt_')
    ? currentSong.id.replace('yt_', '')
    : null;

  // 1. Ambil lirik lagu secara otomatis saat lagu berganti atau tab lirik dibuka
  useEffect(() => {
    if (!currentSong) return;

    let isMounted = true;
    setIsLoadingLyrics(true);
    setSyncedLines([]);
    setStanzas([]);
    setPlainStanzas([]);
    setPlainLyrics(null);

    const fetchLyrics = async () => {
      try {
        const queryParams = new URLSearchParams({
          title: currentSong.title,
          artist: currentSong.artist_name || '',
        });
        const res = await apiRequest<{
          success: boolean;
          data: { lyrics: string | null; syncedLyrics: string | null; source: string };
        }>(`/songs/${currentSong.id}/lyrics?${queryParams.toString()}`);

        if (!isMounted) return;

        if (res.data?.syncedLyrics) {
          const rawLines = res.data.syncedLyrics.split('\n');
          const timeRegex = /\[(\d{2}):(\d{2}(?:\.\d+)?)\]/;
          const metaRegex = /^\[(ti|ar|al|by|offset|length|re|ve):/i;
          const sectionRegex = /^(\[|\()?(Verse|Chorus|Reff|Refrein|Pre-Chorus|Bridge|Outro|Intro|Bait|Hook)\b.*(\]|\))?$/i;

          const rawTimed: { time: number; text: string }[] = [];

          for (const raw of rawLines) {
            const line = raw.trim();
            if (!line || metaRegex.test(line)) continue;
            const match = line.match(timeRegex);
            if (match) {
              const mins = parseInt(match[1], 10);
              const secs = parseFloat(match[2]);
              const text = line.replace(timeRegex, '').trim();
              rawTimed.push({ time: mins * 60 + secs, text });
            }
          }

          rawTimed.sort((a, b) => a.time - b.time);

          const stanzaList: StanzaGroup[] = [];
          const allLines: SyncedLine[] = [];
          let currentLines: SyncedLine[] = [];
          let stanzaCounter = 1;
          let currentLabel = 'Bait 1';

          for (let i = 0; i < rawTimed.length; i++) {
            const item = rawTimed[i];
            const time = item.time;
            const text = item.text;

            if (sectionRegex.test(text)) {
              if (currentLines.length > 0) {
                stanzaList.push({
                  stanzaIndex: stanzaCounter,
                  label: currentLabel,
                  lines: [...currentLines],
                });
                stanzaCounter++;
                currentLines = [];
              }
              const clean = text.replace(/[\[\]\(\)]/g, '').trim();
              currentLabel = clean || `Bait ${stanzaCounter}`;
              continue;
            }

            if (!text) {
              if (currentLines.length > 0) {
                stanzaList.push({
                  stanzaIndex: stanzaCounter,
                  label: currentLabel,
                  lines: [...currentLines],
                });
                stanzaCounter++;
                currentLabel = `Bait ${stanzaCounter}`;
                currentLines = [];
              }
              continue;
            }

            if (currentLines.length > 0) {
              const lastTime = currentLines[currentLines.length - 1].time;
              if (time - lastTime > 5.5) {
                stanzaList.push({
                  stanzaIndex: stanzaCounter,
                  label: currentLabel,
                  lines: [...currentLines],
                });
                stanzaCounter++;
                currentLabel = `Bait ${stanzaCounter}`;
                currentLines = [];
              }
            }

            const parsedLine: SyncedLine = {
              time,
              text,
              stanzaIndex: stanzaCounter,
              lineIndex: currentLines.length + 1,
              globalIndex: allLines.length,
            };
            currentLines.push(parsedLine);
            allLines.push(parsedLine);
          }

          if (currentLines.length > 0) {
            stanzaList.push({
              stanzaIndex: stanzaCounter,
              label: currentLabel,
              lines: [...currentLines],
            });
          }

          if (allLines.length > 0) {
            setSyncedLines(allLines);
            setStanzas(stanzaList);
          } else {
            setPlainLyrics(res.data.lyrics);
          }
        } else if (res.data?.lyrics) {
          setPlainLyrics(res.data.lyrics);
          const rawLines = res.data.lyrics.split('\n');
          const pStanzas: PlainStanza[] = [];
          let cur: string[] = [];
          let sCount = 1;
          for (const line of rawLines) {
            const t = line.trim();
            if (!t) {
              if (cur.length > 0) {
                pStanzas.push({ stanzaIndex: sCount, label: `Bait ${sCount}`, lines: [...cur] });
                sCount++;
                cur = [];
              }
            } else {
              cur.push(t);
            }
          }
          if (cur.length > 0) {
            pStanzas.push({ stanzaIndex: sCount, label: `Bait ${sCount}`, lines: [...cur] });
          }
          setPlainStanzas(pStanzas);
        } else {
          setPlainLyrics(null);
        }
      } catch {
        if (isMounted) setPlainLyrics(null);
      } finally {
        if (isMounted) setIsLoadingLyrics(false);
      }
    };

    fetchLyrics();

    return () => {
      isMounted = false;
    };
  }, [currentSong?.id]);

  // 2. Kalkulasi baris lirik aktif secara real-time berdasarkan currentTime (Karaoke Mode)
  useEffect(() => {
    if (syncedLines.length === 0) return;

    let index = -1;
    for (let i = 0; i < syncedLines.length; i++) {
      if (currentTime >= syncedLines[i].time) {
        index = i;
      } else {
        break;
      }
    }

    if (index !== activeLineIndex) {
      setActiveLineIndex(index);
      if (activeLineRef.current && fullscreenTab === 'lyrics') {
        activeLineRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  }, [currentTime, syncedLines, fullscreenTab]);

  if (!isFullscreenOpen || !currentSong) return null;

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-[#1a1429] via-[#0d0d0d] to-black flex flex-col justify-between p-6 md:p-8 select-none animate-in fade-in duration-300">
      {/* 1. Header Layar Penuh */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsFullscreenOpen(false)}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          title="Tutup Layar Penuh"
        >
          <ChevronDown className="w-6 h-6" />
        </button>

        <div className="flex flex-col items-center">
          <span className="text-[11px] uppercase tracking-widest text-spotify-subtext font-semibold flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-spotify-green" />
            SPOTIFY LITE MUSIC PLAYER
          </span>
          <span className="text-sm font-bold text-white truncate max-w-xs md:max-w-md">
            {currentSong.album_title || 'Audio Stream'}
          </span>
        </div>

        {/* Tab Switcher: Lagu / Video / Lirik / Antrean (Mirip YouTube Music) */}
        <div className="flex items-center gap-x-1.5 bg-black/60 p-1.5 rounded-full border border-white/10 shadow-lg">
          <button
            onClick={() => setFullscreenTab('cover')}
            className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
              fullscreenTab === 'cover'
                ? 'bg-white text-black shadow-md'
                : 'text-spotify-subtext hover:text-white'
            }`}
          >
            <Music2 className="w-3.5 h-3.5" />
            Lagu
          </button>
          <button
            onClick={() => setFullscreenTab('video')}
            className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
              fullscreenTab === 'video'
                ? 'bg-red-600 text-white shadow-md shadow-red-900/50'
                : 'text-spotify-subtext hover:text-white'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            Video
          </button>
          <button
            onClick={() => setFullscreenTab('lyrics')}
            className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
              fullscreenTab === 'lyrics'
                ? 'bg-spotify-green text-black shadow-md'
                : 'text-spotify-subtext hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Lirik
          </button>
          <button
            onClick={() => setFullscreenTab('queue')}
            className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
              fullscreenTab === 'queue'
                ? 'bg-white text-black shadow-md'
                : 'text-spotify-subtext hover:text-white'
            }`}
          >
            <ListMusic className="w-3.5 h-3.5" />
            Antrean ({queue.length})
          </button>
        </div>
      </div>

      {/* 2. Konten Tengah Berdasarkan Tab */}
      <div className="flex-1 flex items-center justify-center py-4 overflow-hidden">
        {/* TAB 1: COVER LAGU (Audio Mode) */}
        {fullscreenTab === 'cover' && (
          <div className="flex flex-col items-center max-w-md w-full animate-in fade-in zoom-in-95 duration-200">
            <div className="relative w-72 h-72 md:w-84 md:h-84 rounded-2xl overflow-hidden shadow-2xl shadow-emerald-950/40 border border-white/10 group">
              <img
                src={currentSong.cover_url || 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=600'}
                alt={currentSong.title}
                className={`w-full h-full object-cover transition-transform duration-700 ${
                  isPlaying ? 'scale-105' : 'scale-100'
                }`}
              />
            </div>
          </div>
        )}

        {/* TAB 2: MODE VIDEO (YouTube Music Video Mode) */}
        {fullscreenTab === 'video' && (
          <div className="flex flex-col items-center max-w-4xl w-full h-full justify-center px-4 animate-in fade-in zoom-in-95 duration-200">
            {ytVideoId ? (
              <div className="relative w-full aspect-video max-h-[62vh] rounded-2xl overflow-hidden shadow-2xl shadow-red-950/40 border border-red-500/20 bg-black">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${ytVideoId}?autoplay=1&enablejsapi=1&rel=0`}
                  title={currentSong.title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center bg-white/5 rounded-2xl border border-white/10 max-w-md">
                <Video className="w-16 h-16 text-red-400 mb-4 opacity-80" />
                <h3 className="text-lg font-bold text-white mb-2">Mode Video</h3>
                <p className="text-sm text-spotify-subtext mb-6">
                  Lagu ini berasal dari katalog audio lokal. Video resmi YouTube dapat dicari otomatis.
                </p>
                <a
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(
                    `${currentSong.title} ${currentSong.artist_name || ''}`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors"
                >
                  Tonton di YouTube
                </a>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: LIRIK (Synchronized Karaoke & Plain Lyrics) */}
        {fullscreenTab === 'lyrics' && (
          <div
            ref={lyricsContainerRef}
            className="max-w-2xl w-full h-full overflow-y-auto px-4 md:px-6 py-6 flex flex-col items-center scroll-smooth scrollbar-thin scrollbar-thumb-white/20"
          >
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-xl font-bold text-white">Lirik Lagu</h3>
              {syncedLines.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-spotify-green/20 text-spotify-green border border-spotify-green/30">
                  KARAOKE SYNC
                </span>
              )}
            </div>

            {/* Status Penanda Bait ke berapa yang sedang dimainkan */}
            {stanzas.length > 0 && activeLineIndex >= 0 && (
              <div className="mb-6 px-4 py-1.5 rounded-full bg-spotify-green/10 border border-spotify-green/30 text-spotify-green text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <span className="w-2 h-2 rounded-full bg-spotify-green animate-pulse" />
                <span>
                  Sedang di Bait ke-{syncedLines[activeLineIndex]?.stanzaIndex || 1} dari {stanzas.length}
                </span>
                <span className="text-spotify-subtext/60">•</span>
                <span className="text-white/80">Baris ke-{syncedLines[activeLineIndex]?.lineIndex || 1}</span>
              </div>
            )}

            {isLoadingLyrics ? (
              <div className="flex flex-col items-center justify-center py-20 text-spotify-subtext gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-spotify-green" />
                <p className="text-sm">Mencari lirik otomatis...</p>
              </div>
            ) : stanzas.length > 0 ? (
              /* Synced Karaoke Lyrics grouped by Stanzas */
              <div className="w-full space-y-8 pb-24 text-center">
                {stanzas.map((stanza) => {
                  const currentStanzaIndex = syncedLines[activeLineIndex]?.stanzaIndex;
                  const isCurrentStanza = stanza.stanzaIndex === currentStanzaIndex;

                  return (
                    <div
                      key={stanza.stanzaIndex}
                      className={`p-5 rounded-2xl transition-all duration-300 border ${
                        isCurrentStanza
                          ? 'bg-spotify-green/5 border-spotify-green/30 shadow-lg shadow-spotify-green/5'
                          : 'bg-white/[0.02] border-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
                        <span
                          className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                            isCurrentStanza
                              ? 'bg-spotify-green text-black font-extrabold shadow-sm'
                              : 'bg-white/10 text-spotify-subtext'
                          }`}
                        >
                          {isCurrentStanza ? `▶ Sedang Aktif: ${stanza.label}` : stanza.label}
                        </span>
                        <span className="text-[11px] text-spotify-subtext font-mono">
                          {stanza.lines.length} Baris
                        </span>
                      </div>

                      <div className="space-y-4">
                        {stanza.lines.map((line) => {
                          const isActive = line.globalIndex === activeLineIndex;
                          return (
                            <p
                              key={line.globalIndex}
                              ref={isActive ? activeLineRef : null}
                              onClick={() => seekTo(line.time)}
                              className={`cursor-pointer transition-all duration-300 py-1.5 px-3 rounded-xl text-lg md:text-xl ${
                                isActive
                                  ? 'text-spotify-green bg-spotify-green/15 scale-[1.02] drop-shadow-[0_0_12px_rgba(29,185,84,0.4)] font-extrabold'
                                  : 'text-spotify-subtext/70 hover:text-white hover:bg-white/5 font-semibold'
                              }`}
                            >
                              {line.text}
                            </p>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : plainStanzas.length > 0 ? (
              /* Plain Text Lyrics grouped by Stanzas */
              <div className="w-full space-y-6 pb-24 text-center max-w-xl">
                {plainStanzas.map((stanza) => (
                  <div
                    key={stanza.stanzaIndex}
                    className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-spotify-subtext">
                        {stanza.label}
                      </span>
                      <span className="text-[11px] text-spotify-subtext font-mono">
                        {stanza.lines.length} Baris
                      </span>
                    </div>
                    <div className="space-y-2 text-base md:text-lg font-medium text-spotify-subtext/90 leading-relaxed">
                      {stanza.lines.map((line, lIdx) => (
                        <p key={lIdx} className="hover:text-white transition-colors">
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FileText className="w-12 h-12 text-spotify-subtext mb-3 opacity-60" />
                <p className="text-spotify-subtext text-base italic mb-1">
                  Lirik belum ditemukan untuk lagu ini.
                </p>
                <p className="text-xs text-spotify-subtext/60">
                  Lirik akan otomatis terhubung jika tersedia di database publik.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ANTREAN LAGU */}
        {fullscreenTab === 'queue' && (
          <div className="max-w-xl w-full h-full overflow-y-auto px-4 divide-y divide-white/5 scrollbar-thin scrollbar-thumb-white/20">
            <h3 className="text-base font-bold text-white mb-3">Antrean Berikutnya</h3>
            {queue.map((item, index) => (
              <div
                key={item.id + index}
                onClick={() => playSong(item, queue)}
                className={`flex items-center justify-between py-2.5 px-3 rounded-lg cursor-pointer transition-colors ${
                  item.id === currentSong.id ? 'bg-white/10 text-spotify-green' : 'hover:bg-white/5 text-white'
                }`}
              >
                <div className="flex items-center gap-x-3 truncate">
                  <span className="text-xs font-mono text-spotify-subtext w-4">{index + 1}</span>
                  <img
                    src={item.cover_url || 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=100'}
                    alt={item.title}
                    className="w-10 h-10 rounded object-cover"
                  />
                  <div className="truncate">
                    <p className="text-sm font-semibold truncate">{item.title}</p>
                    <p className="text-xs text-spotify-subtext truncate">{item.artist_name || 'Artis'}</p>
                  </div>
                </div>
                <span className="text-xs text-spotify-subtext font-mono">
                  {formatTime(item.duration_seconds)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Kontrol Bawah Layar Penuh */}
      <div className="max-w-2xl mx-auto w-full flex flex-col gap-y-4">
        {/* Judul & Tombol Like */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col truncate pr-4">
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight truncate">
              {currentSong.title}
            </h2>
            <p className="text-sm md:text-base text-spotify-subtext font-medium truncate">
              {currentSong.artist_name || 'Artis'}
            </p>
          </div>
          <button
            onClick={toggleLikeCurrentSong}
            className="p-2 text-spotify-subtext hover:text-white transition-colors"
          >
            <Heart
              className={`w-7 h-7 ${
                currentSong.is_liked ? 'fill-spotify-green text-spotify-green' : ''
              }`}
            />
          </button>
        </div>

        {/* Seek Slider */}
        <div className="flex flex-col gap-y-1">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={(e) => seekTo(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-[#4d4d4d] rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-spotify-subtext font-mono">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Tombol Pemutar Besar */}
        <div className="flex items-center justify-between px-6 pt-1">
          <button
            onClick={toggleShuffle}
            className={`p-2 transition-colors ${
              isShuffle ? 'text-spotify-green' : 'text-spotify-subtext hover:text-white'
            }`}
          >
            <Shuffle className="w-5 h-5" />
          </button>

          <button
            onClick={prevSong}
            className="p-2 text-white hover:text-spotify-green transition-colors"
          >
            <SkipBack className="w-8 h-8 fill-current" />
          </button>

          <button
            onClick={togglePlayPause}
            className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-black hover:scale-105 active:scale-95 transition-transform shadow-xl"
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 fill-black stroke-black" />
            ) : (
              <Play className="w-8 h-8 fill-black stroke-black ml-1" />
            )}
          </button>

          <button
            onClick={nextSong}
            className="p-2 text-white hover:text-spotify-green transition-colors"
          >
            <SkipForward className="w-8 h-8 fill-current" />
          </button>

          <button
            onClick={toggleRepeat}
            className={`p-2 transition-colors ${
              repeatMode !== 'off' ? 'text-spotify-green' : 'text-spotify-subtext hover:text-white'
            }`}
          >
            <Repeat className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
