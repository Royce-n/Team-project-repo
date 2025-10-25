-- Setup Approvers Script
-- Run this to assign approver roles to users

-- First, display all users
\echo 'Current Users:'
SELECT id, name, email, role FROM users ORDER BY id;

\echo ''
\echo 'Instructions:'
\echo '1. Note your user ID from the list above'
\echo '2. Edit the INSERT statements below with your user IDs'
\echo '3. Uncomment and run the desired assignments'
\echo ''

-- Example: Assign user ID 1 as advisor
-- Uncomment and change the user_id to match yours
-- INSERT INTO approver_assignments (user_id, approver_role, department, is_active)
-- VALUES (1, 'advisor', 'Computer Science', TRUE);

-- Example: Assign user ID 2 as chairperson
-- INSERT INTO approver_assignments (user_id, approver_role, department, is_active)
-- VALUES (2, 'chairperson', 'Computer Science', TRUE);

-- Example: Assign user ID 3 as dean
-- INSERT INTO approver_assignments (user_id, approver_role, college, is_active)
-- VALUES (3, 'dean', 'College of Natural Sciences and Mathematics', TRUE);

-- Example: Assign user ID 4 as provost
-- INSERT INTO approver_assignments (user_id, approver_role, is_active)
-- VALUES (4, 'provost', TRUE);

-- Quick setup: Make the first user (usually you) all roles for testing
-- Uncomment these if you want to be able to approve at all levels:

-- INSERT INTO approver_assignments (user_id, approver_role, department, is_active)
-- SELECT id, 'advisor', 'Computer Science', TRUE FROM users WHERE id = 1;

-- INSERT INTO approver_assignments (user_id, approver_role, department, is_active)
-- SELECT id, 'chairperson', 'Computer Science', TRUE FROM users WHERE id = 1;

-- INSERT INTO approver_assignments (user_id, approver_role, college, is_active)
-- SELECT id, 'dean', 'College of Natural Sciences and Mathematics', TRUE FROM users WHERE id = 1;

-- INSERT INTO approver_assignments (user_id, approver_role, is_active)
-- SELECT id, 'provost', TRUE FROM users WHERE id = 1;

\echo ''
\echo 'After making changes above, verify assignments:'
SELECT
  u.id,
  u.name,
  u.email,
  aa.approver_role,
  aa.department,
  aa.college
FROM approver_assignments aa
JOIN users u ON aa.user_id = u.id
WHERE aa.is_active = TRUE
ORDER BY u.id, aa.approver_role;
