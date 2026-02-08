-- Guardian Desktop ERP - Link Users to Employees & Check Online Status
-- Run this in Supabase SQL Editor

-- Step 1: Check current user-employee linkage
SELECT 
  u.email as user_email,
  u.role as user_role,
  e.id as employee_id,
  e.first_name,
  e.last_name,
  e.email as employee_email,
  e.user_id,
  e.role as employee_role,
  e.status as employee_status
FROM users u
LEFT JOIN employees e ON u.id = e.user_id OR LOWER(u.email) = LOWER(e.email)
ORDER BY u.email;

-- Step 2: Link employees to users where email matches but user_id is null
UPDATE employees e
SET user_id = u.id
FROM users u
WHERE LOWER(e.email) = LOWER(u.email) 
  AND e.user_id IS NULL;

-- Step 3: Check today's attendance records  
SELECT 
  a.id as attendance_id,
  a.employee_id,
  e.first_name,
  e.last_name,
  a.date,
  a.clock_in,
  a.clock_out,
  a.status,
  CASE WHEN a.clock_out IS NULL THEN 'ONLINE' ELSE 'OFFLINE' END as online_status
FROM attendance a
JOIN employees e ON a.employee_id = e.id
WHERE a.date = CURRENT_DATE
ORDER BY a.clock_in DESC;

-- Step 4: Check all active employees
SELECT 
  e.id,
  e.first_name,
  e.last_name,
  e.email,
  e.user_id,
  u.email as linked_user_email
FROM employees e
LEFT JOIN users u ON e.user_id = u.id
WHERE e.status = 'active';

-- Success message
SELECT 'User-Employee linkage check complete!' AS message;
