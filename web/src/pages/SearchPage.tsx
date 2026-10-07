import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, Play, Heart } from 'lucide-react';
import { apiRequest } from '../services/api';
import { ISong, IArtist, IAlbum, IPlaylist } from '../types';
import { Navbar } from '../components/Navbar';
import { useAudio } from '../context/AudioContext';
import { useNavigate } from 'react-router-dom';

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const SearchPage: React.FC = () => {
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<{
    songs: ISong[];
    artists: IArtist[];
    albums: IAlbum[];
    playlists: IPlaylist[];
  }>({ songs: [], artists: [], albums: [], playlists: [] });
  const [isSearching, setIsSearching] = useState<boolean>(false);

  const { playSong } = useAudio();
  const navigate = useNavigate();

  // Debounced Search Effect (250ms)
  useEffect(() => {
    if (!query.trim()) {
      setResults({ songs: [], artists: [], albums: [], playlists: [] });
      return;
    }

    setIsSearching(true);
    const handler = setTimeout(async () => {
      try {
        const res = await apiRequest(`/search?q=${encodeURIComponent(query)}`);
        if (res.success) {
          setResults(res.data);
        }
      } catch (err) {
        console.error('Kesalahan pencarian:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(handler);
  }, [query]);

  return (
    <div className="flex-1 overflow-y-auto pb-24">
      <Navbar>
        <div className="relative w-80 max-w-md">
          <SearchIcon className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-spotify-subtext" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Mau dengar apa hari ini?"
            className="w-full bg-[#242424] text-white text-sm pl-11 pr-4 py-2.5 rounded-full border border-transparent focus:border-white/20 focus:outline-none placeholder:text-spotify-subtext"
            autoFocus
          />
        </div>
      </Navbar>

      <main className="px-8 py-6 space-y-8">
        {query.trim() === '' ? (
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Jelajahi Semua Kategori</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {[
                { title: 'Musik Santai', color: 'from-purple-800 to-indigo-900' },
                { title: 'Fokus Kerja', color: 'from-emerald-800 to-teal-900' },
                { title: 'Akustik Sore', color: 'from-amber-800 to-orange-950' },
                { title: 'Instrumental', color: 'from-blue-800 to-sky-950' },
                { title: 'Lo-Fi Chill', color: 'from-pink-800 to-rose-950' },
              ].map((cat, idx) => (
                <div
                  key={idx}
                  onClick={() => setQuery(cat.title)}
                  className={`h-36 p-4 rounded-xl bg-gradient-to-br ${cat.color} cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-lg flex flex-col justify-between`}
                >
                  <span className="text-lg font-bold text-white">{cat.title}</span>
                  <span className="text-xs text-white/70">Klik untuk mencari</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Hasil Teratas & Lagu */}
            {results.songs.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-white mb-4">Lagu</h3>
                <div className="space-y-1">
                  {results.songs.map((song) => (
                    <div
                      key={song.id}
                      onClick={() => playSong(song, results.songs)}
                      className="group flex items-center justify-between p-2.5 rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-x-3 truncate">
                        <img
                          src={song.cover_url || 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=100'}
                          alt={song.title}
                          className="w-11 h-11 rounded object-cover"
                        />
                        <div className="truncate">
                          <p className="text-sm font-semibold text-white truncate group-hover:text-spotify-green transition-colors">
                            {song.title}
                          </p>
                          <p
                            onClick={(e) => {
                              e.stopPropagation();
                              const targetArtist = song.artist_name || song.artist_id;
                              if (targetArtist) {
                                navigate(`/artist/${encodeURIComponent(targetArtist)}`);
                              }
                            }}
                            className="text-xs text-spotify-subtext truncate hover:underline hover:text-white cursor-pointer"
                            title={`Lihat artis ${song.artist_name || 'Artis'}`}
                          >
                            {song.artist_name || 'Artis'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-x-4">
                        <span className="text-xs font-mono text-spotify-subtext">
                          {formatDuration(song.duration_seconds)}
                        </span>
                        <button className="w-8 h-8 rounded-full bg-spotify-green flex items-center justify-center text-black opacity-0 group-hover:opacity-100 transition-opacity">
                          <Play className="w-4 h-4 fill-black stroke-black ml-0.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hasil Artis */}
            {results.artists.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-white mb-4">Artis</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                  {results.artists.map((artist) => (
                    <div
                      key={artist.id}
                      onClick={() => navigate(`/artist/${encodeURIComponent(artist.name || artist.id)}`)}
                      className="p-3 rounded-lg bg-spotify-surface hover:bg-spotify-card-hover cursor-pointer transition-all flex flex-col items-center text-center group"
                    >
                      <img
                        src={artist.image_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200'}
                        alt={artist.name}
                        className="w-24 h-24 rounded-full object-cover mb-2 shadow-md group-hover:scale-105 transition-transform"
                      />
                      <p className="text-sm font-semibold text-white truncate w-full group-hover:text-spotify-green">{artist.name}</p>
                      <p className="text-xs text-spotify-subtext">Artis</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hasil Album */}
            {results.albums.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-white mb-4">Album</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                  {results.albums.map((album) => (
                    <div
                      key={album.id}
                      className="p-3 rounded-lg bg-spotify-surface hover:bg-spotify-card-hover cursor-pointer transition-all flex flex-col gap-2"
                    >
                      <img
                        src={album.cover_url || 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=200'}
                        alt={album.title}
                        className="w-full aspect-square rounded-md object-cover shadow-md"
                      />
                      <p className="text-sm font-semibold text-white truncate">{album.title}</p>
                      <p className="text-xs text-spotify-subtext">{album.release_year || 'Album'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!isSearching &&
              results.songs.length === 0 &&
              results.artists.length === 0 &&
              results.albums.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-lg font-bold text-white">Tidak ada hasil untuk "{query}"</p>
                  <p className="text-sm text-spotify-subtext mt-1">
                    Pastikan ejaan sudah benar atau coba kata kunci lain.
                  </p>
                </div>
              )}
          </div>
        )}
      </main>
    </div>
  );
};
