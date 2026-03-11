-- Migration: Change category_mappings to use category_id instead of category text
-- Run this migration in your Supabase SQL editor

-- Step 1: Add category_id column (nullable initially)
ALTER TABLE category_mappings ADD COLUMN category_id UUID REFERENCES categories(id) ON DELETE CASCADE;

-- Step 2: Populate category_id from existing category text
-- This joins with categories table to find matching category names
UPDATE category_mappings cm
SET category_id = c.id
FROM categories c
WHERE cm.category = c.name AND cm.user_id = c.user_id;

-- Step 3: Delete any mappings that don't have a matching category
-- (orphaned mappings where the category name doesn't exist in categories table)
DELETE FROM category_mappings WHERE category_id IS NULL;

-- Step 4: Make category_id NOT NULL now that all rows have values
ALTER TABLE category_mappings ALTER COLUMN category_id SET NOT NULL;

-- Step 5: Drop the old category text column
ALTER TABLE category_mappings DROP COLUMN category;

-- Step 6: Create index on category_id for faster joins
CREATE INDEX idx_category_mappings_category_id ON category_mappings(category_id);
