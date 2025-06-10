-- Migration script to add voter registration functionality
-- Run this script to update existing database

USE voting_system;

-- Add new columns to users table
ALTER TABLE users 
ADD COLUMN password_hash VARCHAR(255) NULL AFTER email,
ADD COLUMN is_registered BOOLEAN DEFAULT FALSE AFTER is_active,
ADD COLUMN registration_token VARCHAR(64) NULL AFTER is_registered,
ADD COLUMN registration_token_expires TIMESTAMP NULL AFTER registration_token,
ADD COLUMN last_login TIMESTAMP NULL AFTER registration_token_expires;

-- Create index for registration token
ALTER TABLE users ADD INDEX idx_registration_token (registration_token);

-- Update existing users to use password_hash and set them as registered
UPDATE users SET password_hash = password, is_registered = TRUE;

-- Drop the old password column (optional - you can keep it for backward compatibility)
-- ALTER TABLE users DROP COLUMN password;

-- Update admin user to ensure it's properly set
UPDATE users 
SET is_registered = TRUE, is_verified = TRUE 
WHERE user_type = 'admin';

SELECT 'Migration completed successfully' as message;
