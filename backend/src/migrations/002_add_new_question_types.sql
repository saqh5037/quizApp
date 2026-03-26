-- Migration: Add new question types to the question_type ENUM
-- Safe to run multiple times (IF NOT EXISTS)
-- Must be run OUTSIDE a transaction in PostgreSQL < 12

ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'multiple_select';
ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'dropdown';
ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'multiple_choice_grid';
ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'checkbox_grid';
