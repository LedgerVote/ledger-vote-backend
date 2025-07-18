-- Add some test voters, candidates, and sessions for testing

-- Create voters (if table exists)
INSERT IGNORE INTO voters (voter_id, name, email, has_voted, created_at) VALUES
('VOTER001', 'Alice Johnson', 'alice@example.com', FALSE, NOW()),
('VOTER002', 'Bob Smith', 'bob@example.com', FALSE, NOW()),
('VOTER003', 'Charlie Brown', 'charlie@example.com', FALSE, NOW()),
('VOTER004', 'Diana Prince', 'diana@example.com', FALSE, NOW()),
('VOTER005', 'Eve Wilson', 'eve@example.com', FALSE, NOW());

-- Create candidates (if table exists)
INSERT IGNORE INTO candidates (name, party, description, created_at) VALUES
('Alice', 'Party A', 'Experienced leader with focus on education', NOW()),
('Bob', 'Party B', 'Business background with economic focus', NOW()),
('Charlie', 'Party C', 'Environmental advocate and community organizer', NOW());

-- Create voting sessions (if table exists)
INSERT IGNORE INTO voting_sessions (title, description, start_time, end_time, is_active, created_at) VALUES
('Test Election 2025', 'Test election for blockchain voting system', 
 NOW() - INTERVAL 1 HOUR, NOW() + INTERVAL 24 HOUR, TRUE, NOW()),
('Municipal Election', 'Local government election', 
 NOW() - INTERVAL 30 MINUTE, NOW() + INTERVAL 48 HOUR, TRUE, NOW());

-- Link candidates to sessions (if session_candidates table exists)
-- You may need to adjust this based on your actual schema
-- INSERT IGNORE INTO session_candidates (session_id, candidate_id) 
-- SELECT s.id, c.id FROM voting_sessions s CROSS JOIN candidates c WHERE s.title = 'Test Election 2025';

COMMIT;
