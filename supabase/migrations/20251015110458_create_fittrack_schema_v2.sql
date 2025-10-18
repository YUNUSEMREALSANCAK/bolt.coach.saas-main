/*
  # FitTrack Database Schema - Complete Setup

  ## Overview
  This migration creates the complete database schema for FitTrack, a fitness coaching platform
  that connects coaches with their clients for training and diet program management.

  ## New Tables

  ### 1. profiles
  Extended user profile information for both coaches and clients
  - `id` (uuid, PK) - References auth.users
  - `user_type` (text) - Either 'coach' or 'client'
  - `full_name` (text) - User's full name
  - `email` (text) - User's email address
  - `avatar_url` (text, nullable) - Profile picture URL
  - `coach_details` (jsonb, nullable) - Additional coach-specific data
  - `client_details` (jsonb, nullable) - Additional client-specific data
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. client_coach_relations
  Manages the relationship between coaches and their clients
  - `id` (bigserial, PK)
  - `coach_id` (uuid) - References profiles(id)
  - `client_id` (uuid) - References profiles(id)
  - `status` (text) - 'pending', 'active', or 'inactive'
  - `created_at` (timestamptz)

  ### 3. training_programs
  Training program templates created by coaches
  - `id` (bigserial, PK)
  - `coach_id` (uuid) - References profiles(id)
  - `name` (text) - Program name
  - `description` (text, nullable) - Program description
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 4. training_days
  Individual training days within a program
  - `id` (bigserial, PK)
  - `program_id` (bigint) - References training_programs(id)
  - `day_name` (text) - e.g., "Day 1 - Chest", "Monday"
  - `order_index` (int) - Display order
  - `created_at` (timestamptz)

  ### 5. exercises
  Exercises within each training day
  - `id` (bigserial, PK)
  - `training_day_id` (bigint) - References training_days(id)
  - `name` (text) - Exercise name
  - `sets` (int) - Number of sets
  - `reps` (text) - Reps (can be range like "8-12")
  - `notes` (text, nullable) - Additional instructions
  - `order_index` (int) - Display order
  - `created_at` (timestamptz)

  ### 6. diet_plans
  Diet plan templates created by coaches
  - `id` (bigserial, PK)
  - `coach_id` (uuid) - References profiles(id)
  - `name` (text) - Plan name
  - `target_calories` (int, nullable) - Daily calorie target
  - `description` (text, nullable) - Plan description
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 7. meals
  Individual meals within a diet plan
  - `id` (bigserial, PK)
  - `plan_id` (bigint) - References diet_plans(id)
  - `meal_name` (text) - e.g., "Breakfast", "Lunch"
  - `description` (text, nullable) - Meal details/ingredients
  - `calories` (int, nullable) - Meal calories
  - `order_index` (int) - Display order
  - `created_at` (timestamptz)

  ### 8. client_assignments
  Tracks which programs are assigned to which clients
  - `id` (bigserial, PK)
  - `client_id` (uuid) - References profiles(id)
  - `training_program_id` (bigint, nullable) - References training_programs(id)
  - `diet_plan_id` (bigint, nullable) - References diet_plans(id)
  - `assigned_at` (timestamptz)
  - `assigned_by` (uuid) - Coach who made the assignment

  ### 9. progress_logs
  Tracks client progress on training days and meals
  - `id` (bigserial, PK)
  - `client_id` (uuid) - References profiles(id)
  - `log_type` (text) - 'training' or 'diet_meal'
  - `related_id` (bigint) - ID of training_day or meal
  - `completed_at` (timestamptz) - When completed
  - `is_cheat_meal` (bool) - For diet logs only
  - `notes` (text, nullable) - Client notes

  ### 10. messages
  Chat messages between coaches and clients
  - `id` (bigserial, PK)
  - `sender_id` (uuid) - References profiles(id)
  - `receiver_id` (uuid) - References profiles(id)
  - `content` (text, nullable) - Message text
  - `attachment_url` (text, nullable) - File attachment URL
  - `read_at` (timestamptz, nullable) - When message was read
  - `created_at` (timestamptz)

  ## Security (RLS Policies)

  All tables have Row Level Security enabled with restrictive policies that verify
  authentication and ownership/membership before allowing access.

  ## Indexes
  - Foreign key columns are indexed for query performance
  - Frequently queried columns have indexes

  ## Important Notes
  - All timestamp columns use `timestamptz` for timezone awareness
  - RLS policies are restrictive by default - no access without explicit permission
  - All policies verify authentication using `auth.uid()`
  - Cascade deletes are configured to maintain referential integrity
*/

-- Create helper functions first
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, user_type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'client')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type text NOT NULL CHECK (user_type IN ('coach', 'client')),
  full_name text NOT NULL,
  email text NOT NULL,
  avatar_url text,
  coach_details jsonb,
  client_details jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. client_coach_relations table
CREATE TABLE IF NOT EXISTS client_coach_relations (
  id bigserial PRIMARY KEY,
  coach_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(coach_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_client_coach_relations_coach_id ON client_coach_relations(coach_id);
CREATE INDEX IF NOT EXISTS idx_client_coach_relations_client_id ON client_coach_relations(client_id);

ALTER TABLE client_coach_relations ENABLE ROW LEVEL SECURITY;

-- 3. training_programs table
CREATE TABLE IF NOT EXISTS training_programs (
  id bigserial PRIMARY KEY,
  coach_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_programs_coach_id ON training_programs(coach_id);

ALTER TABLE training_programs ENABLE ROW LEVEL SECURITY;

-- 4. training_days table
CREATE TABLE IF NOT EXISTS training_days (
  id bigserial PRIMARY KEY,
  program_id bigint NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
  day_name text NOT NULL,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_days_program_id ON training_days(program_id);

ALTER TABLE training_days ENABLE ROW LEVEL SECURITY;

-- 5. exercises table
CREATE TABLE IF NOT EXISTS exercises (
  id bigserial PRIMARY KEY,
  training_day_id bigint NOT NULL REFERENCES training_days(id) ON DELETE CASCADE,
  name text NOT NULL,
  sets int NOT NULL DEFAULT 3,
  reps text NOT NULL DEFAULT '10',
  notes text,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exercises_training_day_id ON exercises(training_day_id);

ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- 6. diet_plans table
CREATE TABLE IF NOT EXISTS diet_plans (
  id bigserial PRIMARY KEY,
  coach_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  target_calories int,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_diet_plans_coach_id ON diet_plans(coach_id);

ALTER TABLE diet_plans ENABLE ROW LEVEL SECURITY;

-- 7. meals table
CREATE TABLE IF NOT EXISTS meals (
  id bigserial PRIMARY KEY,
  plan_id bigint NOT NULL REFERENCES diet_plans(id) ON DELETE CASCADE,
  meal_name text NOT NULL,
  description text,
  calories int,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meals_plan_id ON meals(plan_id);

ALTER TABLE meals ENABLE ROW LEVEL SECURITY;

-- 8. client_assignments table
CREATE TABLE IF NOT EXISTS client_assignments (
  id bigserial PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  training_program_id bigint REFERENCES training_programs(id) ON DELETE SET NULL,
  diet_plan_id bigint REFERENCES diet_plans(id) ON DELETE SET NULL,
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid NOT NULL REFERENCES profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_client_assignments_client_id ON client_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_client_assignments_training_program_id ON client_assignments(training_program_id);
CREATE INDEX IF NOT EXISTS idx_client_assignments_diet_plan_id ON client_assignments(diet_plan_id);

ALTER TABLE client_assignments ENABLE ROW LEVEL SECURITY;

-- 9. progress_logs table
CREATE TABLE IF NOT EXISTS progress_logs (
  id bigserial PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  log_type text NOT NULL CHECK (log_type IN ('training', 'diet_meal')),
  related_id bigint NOT NULL,
  completed_at timestamptz DEFAULT now(),
  is_cheat_meal boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_progress_logs_client_id ON progress_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_progress_logs_log_type ON progress_logs(log_type);

ALTER TABLE progress_logs ENABLE ROW LEVEL SECURITY;

-- 10. messages table
CREATE TABLE IF NOT EXISTS messages (
  id bigserial PRIMARY KEY,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text,
  attachment_url text,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Coaches can read their clients profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM client_coach_relations
      WHERE client_coach_relations.coach_id = auth.uid()
      AND client_coach_relations.client_id = profiles.id
      AND client_coach_relations.status = 'active'
    )
  );

CREATE POLICY "Clients can read their coach profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM client_coach_relations
      WHERE client_coach_relations.client_id = auth.uid()
      AND client_coach_relations.coach_id = profiles.id
      AND client_coach_relations.status = 'active'
    )
  );

-- RLS Policies for client_coach_relations
CREATE POLICY "Coaches can insert client relations"
  ON client_coach_relations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Coaches can view their client relations"
  ON client_coach_relations FOR SELECT
  TO authenticated
  USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can update their client relations"
  ON client_coach_relations FOR UPDATE
  TO authenticated
  USING (auth.uid() = coach_id)
  WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Coaches can delete their client relations"
  ON client_coach_relations FOR DELETE
  TO authenticated
  USING (auth.uid() = coach_id);

CREATE POLICY "Clients can view their coach relations"
  ON client_coach_relations FOR SELECT
  TO authenticated
  USING (auth.uid() = client_id);

-- RLS Policies for training_programs
CREATE POLICY "Coaches can insert their training programs"
  ON training_programs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Coaches can view their training programs"
  ON training_programs FOR SELECT
  TO authenticated
  USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can update their training programs"
  ON training_programs FOR UPDATE
  TO authenticated
  USING (auth.uid() = coach_id)
  WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Coaches can delete their training programs"
  ON training_programs FOR DELETE
  TO authenticated
  USING (auth.uid() = coach_id);

CREATE POLICY "Clients can view assigned training programs"
  ON training_programs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM client_assignments
      WHERE client_assignments.client_id = auth.uid()
      AND client_assignments.training_program_id = training_programs.id
    )
  );

-- RLS Policies for training_days
CREATE POLICY "Coaches can insert training days in their programs"
  ON training_days FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM training_programs
      WHERE training_programs.id = training_days.program_id
      AND training_programs.coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can view training days in their programs"
  ON training_days FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM training_programs
      WHERE training_programs.id = training_days.program_id
      AND training_programs.coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can update training days in their programs"
  ON training_days FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM training_programs
      WHERE training_programs.id = training_days.program_id
      AND training_programs.coach_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM training_programs
      WHERE training_programs.id = training_days.program_id
      AND training_programs.coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can delete training days in their programs"
  ON training_days FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM training_programs
      WHERE training_programs.id = training_days.program_id
      AND training_programs.coach_id = auth.uid()
    )
  );

CREATE POLICY "Clients can view training days from assigned programs"
  ON training_days FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM client_assignments ca
      JOIN training_programs tp ON ca.training_program_id = tp.id
      WHERE ca.client_id = auth.uid()
      AND tp.id = training_days.program_id
    )
  );

-- RLS Policies for exercises
CREATE POLICY "Coaches can insert exercises in their programs"
  ON exercises FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM training_days td
      JOIN training_programs tp ON td.program_id = tp.id
      WHERE td.id = exercises.training_day_id
      AND tp.coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can view exercises in their programs"
  ON exercises FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM training_days td
      JOIN training_programs tp ON td.program_id = tp.id
      WHERE td.id = exercises.training_day_id
      AND tp.coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can update exercises in their programs"
  ON exercises FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM training_days td
      JOIN training_programs tp ON td.program_id = tp.id
      WHERE td.id = exercises.training_day_id
      AND tp.coach_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM training_days td
      JOIN training_programs tp ON td.program_id = tp.id
      WHERE td.id = exercises.training_day_id
      AND tp.coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can delete exercises in their programs"
  ON exercises FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM training_days td
      JOIN training_programs tp ON td.program_id = tp.id
      WHERE td.id = exercises.training_day_id
      AND tp.coach_id = auth.uid()
    )
  );

CREATE POLICY "Clients can view exercises from assigned programs"
  ON exercises FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM training_days td
      JOIN training_programs tp ON td.program_id = tp.id
      JOIN client_assignments ca ON ca.training_program_id = tp.id
      WHERE td.id = exercises.training_day_id
      AND ca.client_id = auth.uid()
    )
  );

-- RLS Policies for diet_plans
CREATE POLICY "Coaches can insert their diet plans"
  ON diet_plans FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Coaches can view their diet plans"
  ON diet_plans FOR SELECT
  TO authenticated
  USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can update their diet plans"
  ON diet_plans FOR UPDATE
  TO authenticated
  USING (auth.uid() = coach_id)
  WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Coaches can delete their diet plans"
  ON diet_plans FOR DELETE
  TO authenticated
  USING (auth.uid() = coach_id);

CREATE POLICY "Clients can view assigned diet plans"
  ON diet_plans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM client_assignments
      WHERE client_assignments.client_id = auth.uid()
      AND client_assignments.diet_plan_id = diet_plans.id
    )
  );

-- RLS Policies for meals
CREATE POLICY "Coaches can insert meals in their diet plans"
  ON meals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM diet_plans
      WHERE diet_plans.id = meals.plan_id
      AND diet_plans.coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can view meals in their diet plans"
  ON meals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM diet_plans
      WHERE diet_plans.id = meals.plan_id
      AND diet_plans.coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can update meals in their diet plans"
  ON meals FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM diet_plans
      WHERE diet_plans.id = meals.plan_id
      AND diet_plans.coach_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM diet_plans
      WHERE diet_plans.id = meals.plan_id
      AND diet_plans.coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can delete meals in their diet plans"
  ON meals FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM diet_plans
      WHERE diet_plans.id = meals.plan_id
      AND diet_plans.coach_id = auth.uid()
    )
  );

CREATE POLICY "Clients can view meals from assigned diet plans"
  ON meals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM diet_plans dp
      JOIN client_assignments ca ON ca.diet_plan_id = dp.id
      WHERE dp.id = meals.plan_id
      AND ca.client_id = auth.uid()
    )
  );

-- RLS Policies for client_assignments
CREATE POLICY "Coaches can assign programs to their clients"
  ON client_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = assigned_by
    AND EXISTS (
      SELECT 1 FROM client_coach_relations
      WHERE client_coach_relations.coach_id = auth.uid()
      AND client_coach_relations.client_id = client_assignments.client_id
      AND client_coach_relations.status = 'active'
    )
  );

CREATE POLICY "Coaches can view their client assignments"
  ON client_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM client_coach_relations
      WHERE client_coach_relations.coach_id = auth.uid()
      AND client_coach_relations.client_id = client_assignments.client_id
    )
  );

CREATE POLICY "Clients can view their assignments"
  ON client_assignments FOR SELECT
  TO authenticated
  USING (auth.uid() = client_id);

CREATE POLICY "Coaches can update their client assignments"
  ON client_assignments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM client_coach_relations
      WHERE client_coach_relations.coach_id = auth.uid()
      AND client_coach_relations.client_id = client_assignments.client_id
      AND client_coach_relations.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM client_coach_relations
      WHERE client_coach_relations.coach_id = auth.uid()
      AND client_coach_relations.client_id = client_assignments.client_id
      AND client_coach_relations.status = 'active'
    )
  );

CREATE POLICY "Coaches can delete their client assignments"
  ON client_assignments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM client_coach_relations
      WHERE client_coach_relations.coach_id = auth.uid()
      AND client_coach_relations.client_id = client_assignments.client_id
    )
  );

-- RLS Policies for progress_logs
CREATE POLICY "Clients can insert their own progress logs"
  ON progress_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can view their own progress logs"
  ON progress_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = client_id);

CREATE POLICY "Coaches can view their clients progress logs"
  ON progress_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM client_coach_relations
      WHERE client_coach_relations.coach_id = auth.uid()
      AND client_coach_relations.client_id = progress_logs.client_id
      AND client_coach_relations.status = 'active'
    )
  );

-- RLS Policies for messages
CREATE POLICY "Users can insert messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM client_coach_relations
      WHERE (
        (client_coach_relations.coach_id = sender_id AND client_coach_relations.client_id = receiver_id)
        OR
        (client_coach_relations.client_id = sender_id AND client_coach_relations.coach_id = receiver_id)
      )
      AND client_coach_relations.status = 'active'
    )
  );

CREATE POLICY "Users can view messages sent to or from them"
  ON messages FOR SELECT
  TO authenticated
  USING (auth.uid() = receiver_id OR auth.uid() = sender_id);

CREATE POLICY "Users can update read status of messages sent to them"
  ON messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- Triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_training_programs_updated_at ON training_programs;
CREATE TRIGGER update_training_programs_updated_at
  BEFORE UPDATE ON training_programs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_diet_plans_updated_at ON diet_plans;
CREATE TRIGGER update_diet_plans_updated_at
  BEFORE UPDATE ON diet_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();