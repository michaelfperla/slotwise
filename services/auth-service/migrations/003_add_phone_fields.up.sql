-- Add phone number fields to users table
ALTER TABLE users 
ADD COLUMN phone VARCHAR(20) UNIQUE,
ADD COLUMN is_phone_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN phone_verified_at TIMESTAMP;

-- Create index on phone for faster lookups
CREATE INDEX idx_users_phone ON users(phone) WHERE phone IS NOT NULL;
