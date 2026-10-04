export type UserRole = 'user' | 'admin';
export type AudioQuality = 'low' | 'medium' | 'high';

export interface IUser {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  avatar_url?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface IArtist {
  id: string;
  name: string;
  bio?: string | null;
  image_url?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface IAlbum {
  id: string;
  artist_id: string;
  title: string;
  cover_url?: string | null;
  release_year?: number | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface ISong {
  id: string;
  title: string;
  artist_id: string;
  album_id?: string | null;
  duration_seconds: number;
  file_path: string;
  file_size: number;
  mime_type: string;
  bitrate: number;
  cover_url?: string | null;
  lyrics?: string | null;
  play_count: number;
  is_public: boolean;
  created_at?: Date;
  updated_at?: Date;
  // Join properties untuk kemudahan client
  artist_name?: string;
  album_title?: string;
  is_liked?: boolean;
}

export interface IPlaylist {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  cover_url?: string | null;
  is_public: boolean;
  created_at?: Date;
  updated_at?: Date;
  song_count?: number;
}

export interface IPlaylistSong {
  id: string;
  playlist_id: string;
  song_id: string;
  order_index: number;
  added_at?: Date;
}

export interface IUserSettings {
  user_id: string;
  audio_quality: AudioQuality;
  theme: string;
  offline_mode: boolean;
  last_played_song_id?: string | null;
  last_played_position_seconds: number;
  last_queue_ids: string[];
  updated_at?: Date;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}
