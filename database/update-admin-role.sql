-- Guardian Desktop ERP - Update Admin Role to Super Admin
-- Run this SQL in Supabase SQL Editor to update the existing admin

-- Update admin user role to super_admin
UPDATE users 
SET role = 'super_admin' 
WHERE email = 'admin@guardian.com';

-- Update admin employee role to super_admin  
UPDATE employees 
SET role = 'super_admin' 
WHERE email = 'admin@guardian.com';

-- Verify the update
SELECT u.email, u.role as user_role, e.role as employee_role
FROM users u
LEFT JOIN employees e ON u.id = e.user_id
WHERE u.email = 'admin@guardian.com';

-- Success message
SELECT 'Admin role updated to super_admin successfully!' AS message;
