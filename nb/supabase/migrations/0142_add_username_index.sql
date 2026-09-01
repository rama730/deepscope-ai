-- Create a unique, case-insensitive index on username for fast lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower ON profiles (lower(username));
