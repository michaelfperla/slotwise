-- Remove phone number fields from users table
DROP INDEX IF EXISTS idx_users_phone;

ALTER TABLE users 
DROP COLUMN IF EXISTS phone,
DROP COLUMN IF EXISTS is_phone_verified,
DROP COLUMN IF EXISTS phone_verified_at;
