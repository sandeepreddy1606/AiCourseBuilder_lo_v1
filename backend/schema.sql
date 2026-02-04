-- Enable pgcrypto for UUID generation if using older Postgres, though gen_random_uuid() is built-in in PG 13+
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  full_name VARCHAR(255)
);

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  topic VARCHAR(255),
  completion_percentage INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Lessons table
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  order_index INTEGER NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  quiz_score INTEGER,
  videos JSONB DEFAULT '[]',
  notes TEXT,
  quiz_data JSONB,
  
  -- Pedagogical Metadata
  cognitive_level VARCHAR(50) DEFAULT 'remember', -- Bloom's Taxonomy: remember, understand, apply, etc.
  pedagogical_metadata JSONB DEFAULT '{}', -- Store distractor logic, key concepts, etc.
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_courses_user_id ON courses(user_id);
CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON lessons(course_id);


-- Usage Logs table
CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  tokens INTEGER NOT NULL,
  model VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);

-- Learning States Table (Tracks User Progress & State for DQN)
CREATE TABLE IF NOT EXISTS learning_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  current_lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  
  -- State Variables
  modules_completed INTEGER DEFAULT 0,
  average_quiz_score FLOAT DEFAULT 0.0,
  last_interaction_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- User Mastery Level (0.0 to 1.0)
  mastery_level FLOAT DEFAULT 0.5, 
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_learning_states_user_course ON learning_states(user_id, course_id);

-- Adaptive Actions Table (Log Difficulty Adjustments)
CREATE TABLE IF NOT EXISTS adaptive_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  
  -- Action Taken
  previous_difficulty FLOAT,
  new_difficulty FLOAT,
  reason TEXT, -- e.g., "Quiz score < 50%, lowering difficulty"
  
  -- Reward (Feedback)
  quiz_score_after_action INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_adaptive_actions_course ON adaptive_actions(course_id);

-- Add Logic to update updated_at on learning_states
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_learning_states_updated_at
    BEFORE UPDATE ON learning_states
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
