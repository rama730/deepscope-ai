export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  cover_image_url: string | null;
  headline: string | null;
  location: string | null;
  website: string | null;
  availability_status: string | null;
  open_to: string[] | null;
  profile_strength: number;
  custom_url: string | null;
  role: 'user' | 'admin';
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  [key: string]: any; // For additional fields that may exist
}
