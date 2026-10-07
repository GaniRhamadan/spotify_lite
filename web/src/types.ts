export interface ISong {
  id: string;
  title: string;
  artist_id: string;
  artist_name?: string;
  album_id?: string | null;
  album_title?: string | null;
  duration_seconds: number;
  cover_url?: string | null;
  lyrics?: string | null;
  play_count: number;
  is_liked?: boolean;
}

export interface IArtist {
  id: string;
  name: string;
  bio?: string | null;
  image_url?: string | null;
  monthly_listeners?: string | null;
}

export interface IAlbum {
  id: string;
  artist_id: string;
  artist_name?: string;
  title: string;
  cover_url?: string | null;
  release_year?: number;
}

export interface IPlaylist {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  cover_url?: string | null;
  is_public: boolean;
  song_count?: number;
  songs?: ISong[];
}

export interface IUser {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  avatar_url?: string | null;
}
