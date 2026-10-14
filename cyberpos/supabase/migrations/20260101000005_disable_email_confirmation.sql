-- Disable email confirmation for development
-- Note: This should be re-enabled in production

-- Update existing unconfirmed users
update auth.users 
set email_confirmed_at = now() 
where email_confirmed_at is null;
