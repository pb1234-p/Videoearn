/*
  # Create Watch & Earn Application Schema

  ## Overview
  Complete database schema for the Watch & Earn INR application with user authentication,
  video tasks, watch tracking, and withdrawal management.

  ## New Tables
  
  ### 1. `users`
  Stores user profile and balance information
  - `id` (uuid, primary key) - References auth.users
  - `email` (text) - User email address
  - `display_name` (text) - User's display name
  - `balance` (numeric) - Current balance in INR
  - `total_earned` (numeric) - Total amount earned to date
  - `upi_id` (text) - Default UPI ID for withdrawals
  - `role` (text) - User role (user or admin)
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. `videos`
  Admin-defined video tasks for users to earn money
  - `id` (uuid, primary key)
  - `title` (text) - Video title
  - `description` (text) - Video description
  - `youtube_url` (text) - YouTube video URL
  - `reward_amount` (numeric) - Reward in INR
  - `duration` (integer) - Required watch time in seconds
  - `active` (boolean) - Whether video is available
  - `created_at` (timestamptz) - Creation timestamp

  ### 3. `watched_videos`
  Prevents users from earning multiple times from the same video
  - `id` (uuid, primary key)
  - `user_id` (uuid) - References users.id
  - `video_id` (uuid) - References videos.id
  - `watched_at` (timestamptz) - Timestamp when video was watched
  - `reward_earned` (numeric) - Reward earned for this watch

  ### 4. `withdrawals`
  User withdrawal requests
  - `id` (uuid, primary key)
  - `user_id` (uuid) - References users.id
  - `user_email` (text) - User email
  - `amount` (numeric) - Withdrawal amount
  - `upi_id` (text) - UPI ID for payment
  - `status` (text) - Status: pending, approved, rejected
  - `created_at` (timestamptz) - Request creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Security
  - Row Level Security enabled on all tables
  - Policies restrict access based on user authentication and ownership
  - Admin role required for video management and withdrawal approval
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text NOT NULL,
  balance numeric DEFAULT 0 NOT NULL CHECK (balance >= 0),
  total_earned numeric DEFAULT 0 NOT NULL CHECK (total_earned >= 0),
  upi_id text,
  role text DEFAULT 'user' NOT NULL CHECK (role IN ('user', 'admin')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create videos table
CREATE TABLE IF NOT EXISTS videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  youtube_url text NOT NULL,
  reward_amount numeric NOT NULL CHECK (reward_amount > 0),
  duration integer NOT NULL CHECK (duration > 0),
  active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create watched_videos table
CREATE TABLE IF NOT EXISTS watched_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  watched_at timestamptz DEFAULT now() NOT NULL,
  reward_earned numeric NOT NULL CHECK (reward_earned >= 0),
  UNIQUE(user_id, video_id)
);

-- Create withdrawals table
CREATE TABLE IF NOT EXISTS withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  upi_id text NOT NULL,
  status text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_watched_videos_user_id ON watched_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_watched_videos_video_id ON watched_videos(video_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_videos_active ON videos(active);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE watched_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Videos table policies
CREATE POLICY "Anyone authenticated can view active videos"
  ON videos FOR SELECT
  TO authenticated
  USING (active = true);

CREATE POLICY "Admins can view all videos"
  ON videos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert videos"
  ON videos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update videos"
  ON videos FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete videos"
  ON videos FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Watched videos table policies
CREATE POLICY "Users can view own watched videos"
  ON watched_videos FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own watched videos"
  ON watched_videos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all watched videos"
  ON watched_videos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Withdrawals table policies
CREATE POLICY "Users can view own withdrawals"
  ON withdrawals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own withdrawals"
  ON withdrawals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can view all withdrawals"
  ON withdrawals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update withdrawals"
  ON withdrawals FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Create function to handle user creation from auth.users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, balance, total_earned, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    0,
    0,
    CASE WHEN NEW.email = 'beatd5513@gmail.com' THEN 'admin' ELSE 'user' END,
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
