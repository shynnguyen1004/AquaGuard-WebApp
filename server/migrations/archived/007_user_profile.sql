-- ============================================================
-- Migration 007: Add profile fields to users table
-- Purpose: Store email, gender, date_of_birth, emergency_contact
-- for rich user profile support
-- ============================================================

-- Email address (for Google-auth users or manual entry)
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255) DEFAULT '';

-- Gender: male | female | other | '' (empty = not set)
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(10) DEFAULT '';

-- Date of birth (age is calculated from this on-the-fly)
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Emergency contact phone number
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(15) DEFAULT '';
