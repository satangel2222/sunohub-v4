
export interface Song {
  id?: string; // Supabase UUID
  suno_id: string; // Original Suno ID
  title: string;
  artist: string;
  image_url: string;
  audio_url: string;
  duration: number; // in seconds
  tags?: string[];
  category?: string; // Main genre category (e.g., Pop, Rock, Electronic)
  lyrics?: string; // 🔥 新增歌词字段
  
  // Stats
  plays_count?: number;
  likes_count?: number; // Deprecated but kept for compatibility
  
  // New Rating System
  average_rating?: number;
  total_reviews?: number;

  created_at?: string;
  user_id?: string; // The owner of the song (Supabase Auth ID)
}

export interface Review {
  id: string;
  song_id: string;
  user_id: string;
  user_email?: string;
  rating: number; // 1-5
  comment?: string;
  created_at: string;
}

export interface Playlist {
  id: string;
  name: string;
  songs: Song[];
  creator: string;
}

export interface Listener {
  id: string;
  email?: string; // For logged in users
  nickname?: string;
  avatar_url?: string;
  is_guest: boolean;
  gender?: 'male' | 'female' | 'other'; // For random guest avatar generation
  joined_at: string;
}

export interface UserMetadata {
  nickname?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  avatar_url?: string;
}
