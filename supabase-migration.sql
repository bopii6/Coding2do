-- Migration script to add priority_weight column to existing tables
-- Run this in your Supabase SQL Editor if you already have the tables created

-- Add priority_weight column to tasks table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' AND column_name = 'priority_weight'
    ) THEN
        ALTER TABLE tasks ADD COLUMN priority_weight INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add priority_weight column to history table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'history' AND column_name = 'priority_weight'
    ) THEN
        ALTER TABLE history ADD COLUMN priority_weight INTEGER DEFAULT 0;
    END IF;
END $$;

-- Update existing records to have default priority_weight
-- 'now' priority = 1, 'later' priority = -1
UPDATE tasks SET priority_weight = -1 WHERE priority_weight IS NULL OR priority_weight = 0;
UPDATE history SET priority_weight = -1 WHERE priority_weight IS NULL OR priority_weight = 0;

