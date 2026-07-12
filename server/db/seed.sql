-- AssetFlow Seeding Script

-- 1. Departments
INSERT INTO departments (name, code, manager) VALUES
('Engineering', 'ENG', 'Udit Rana'),
('IT Operations', 'IT', 'Rajesh Patel'),
('Marketing', 'MKT', 'Priya Nair'),
('Sales', 'SLS', 'Udit Rana'),
('Human Resources', 'HR', 'Neha Kapoor')
ON CONFLICT (name) DO NOTHING;

-- 2. Categories
INSERT INTO categories (name, description) VALUES
('Computing', 'Laptops, desktops, workstation towers, and servers'),
('Displays', 'Monitors, projectors, and digital display boards'),
('Networking', 'Routers, switches, access points, and hardware firewalls'),
('Furniture', 'Ergonomic chairs, sit-stand desks, and conference tables'),
('Testing Devices', 'Smartphones, tablets, and test benches for hardware testing')
ON CONFLICT (name) DO NOTHING;

-- 3. Users (Password: AssetFlow@2026)
INSERT INTO users (name, email, password_hash, role, department_id) VALUES
('Devansh Patel',   'devansh@assetflow.com',  '$2b$10$qzOqJhSdZS20fiXaVqaOg.t9Q2LXqAUYOjD6Lh28DKmnwIckuC5i2', 'Admin',    2),
('Rajesh Patel',    'rajesh@assetflow.com',   '$2b$10$qzOqJhSdZS20fiXaVqaOg.t9Q2LXqAUYOjD6Lh28DKmnwIckuC5i2', 'Employee', 2),
('Rudra Modi',      'rudra@assetflow.com',    '$2b$10$qzOqJhSdZS20fiXaVqaOg.t9Q2LXqAUYOjD6Lh28DKmnwIckuC5i2', 'Auditor',  1),
('Meet Prajapati',  'meet@assetflow.com',     '$2b$10$qzOqJhSdZS20fiXaVqaOg.t9Q2LXqAUYOjD6Lh28DKmnwIckuC5i2', 'Employee', 1),
('Udit Rana',       'udit@assetflow.com',     '$2b$10$qzOqJhSdZS20fiXaVqaOg.t9Q2LXqAUYOjD6Lh28DKmnwIckuC5i2', 'Manager',  4)
ON CONFLICT (email) DO NOTHING;

-- 4. Assets
INSERT INTO assets (name, serial_number, category_id, department_id, status, acquisition_date, acquisition_cost, condition, location, is_bookable) VALUES
('MacBook Pro 16" M3 Max', 'SN-M3MAX-88219', 1, 1, 'Allocated', '2026-01-10', 3499.00, 'Excellent', 'Bengaluru Office Floor 4', false),
('Dell UltraSharp 32" 4K Monitor', 'SN-DELL4K-00293', 2, 1, 'Available', '2026-02-15', 899.00, 'Good', 'Bengaluru Office Floor 4', false),
('Cisco Catalyst 9300 Switch', 'SN-CISCO-9300X', 3, 2, 'Under Maintenance', '2025-11-20', 4500.00, 'Requires Service', 'Mumbai Data Center', false),
('iPad Pro 12.9" Cellular', 'SN-IPADPRO-90082', 5, 4, 'Allocated', '2026-03-01', 1299.00, 'Excellent', 'Delhi Sales Office', true),
('Herman Miller Aeron Chair', 'SN-AERON-55610', 4, 5, 'Allocated', '2024-06-18', 1450.00, 'Good', 'Pune HR Hub', false),
('Testbench iPhone 15 Pro', 'SN-IPHONE15-2234', 5, 1, 'Available', '2025-10-05', 999.00, 'Fair', 'Chennai Testing Hub', true),
('Lenovo ThinkPad X1 Carbon', 'SN-THINKPAD-00382', 1, 1, 'Allocated', '2025-05-10', 1800.00, 'Good', 'Bengaluru Office Floor 4', false)
ON CONFLICT (serial_number) DO NOTHING;

-- 5. Allocations
INSERT INTO allocations (asset_id, user_id, notes, expected_return_date, status) VALUES
(1, 4, 'Assigned to Meet Prajapati for software engineering work.', NULL, 'active'),
(4, 5, 'Assigned to Udit Rana for field client presentations.', NULL, 'active'),
(5, 1, 'Standard admin desk configuration.', NULL, 'active'),
(7, 4, 'Standard issue work laptop (overdue check showcase).', '2026-06-01', 'active')
ON CONFLICT DO NOTHING;

-- 6. Transfers
INSERT INTO transfers (asset_id, from_department_id, to_department_id, from_user_id, to_user_id, reason, status) VALUES
(1, 2, 1, 2, 4, 'Initial departmental migration', 'approved'),
(4, 4, 1, 5, 4, 'Meet Prajapati needs iPad Pro for testing layout designs in Safari.', 'pending')
ON CONFLICT DO NOTHING;

-- 7. Resources
INSERT INTO resources (name, type, location, capacity) VALUES
('Narmada Conference Room', 'conference_room', 'Bengaluru HQ, Floor 3', 16),
('Bengaluru Server Rack 3B', 'server_rack', 'Mumbai Data Center', 10),
('Chennai iOS Testing Kit 1', 'testing_device', 'Chennai Testing Hub', 1)
ON CONFLICT DO NOTHING;

-- 8. Bookings
INSERT INTO bookings (resource_id, booked_by, start_time, end_time, purpose, status) VALUES
(1, 3, CURRENT_TIMESTAMP + INTERVAL '1 hour',  CURRENT_TIMESTAMP + INTERVAL '2 hours', 'Sprint Review Planning', 'Upcoming'),
(2, 4, CURRENT_TIMESTAMP + INTERVAL '1 day',   CURRENT_TIMESTAMP + INTERVAL '3 days',  'Server benchmark runs',  'Upcoming'),
(1, 4, CURRENT_TIMESTAMP + INTERVAL '10 minutes', CURRENT_TIMESTAMP + INTERVAL '40 minutes', 'Quick UI/UX Review', 'Upcoming')
ON CONFLICT DO NOTHING;

-- 9. Maintenance Requests
INSERT INTO maintenance_requests (asset_id, reported_by, description, priority, status, cost, scheduled_date) VALUES
(3, 1, 'Switch Port 24 experiencing packet drop and physical port damage.', 'high', 'in_progress', 350.00, '2026-07-15')
ON CONFLICT DO NOTHING;

-- 10. Audit Cycles
INSERT INTO audit_cycles (name, scope_department_id, scope_location, start_date, end_date, status) VALUES
('Q3 Hardware Audit', 1, 'Bengaluru Office Floor 4', '2026-07-01', '2026-07-31', 'Open')
ON CONFLICT (name) DO NOTHING;

-- 11. Audit Items
INSERT INTO audit_items (audit_cycle_id, asset_id, expected_location, status, verified_by, verified_at, notes) VALUES
(1, 1, 'Bengaluru Office Floor 4', 'Verified',  3, CURRENT_TIMESTAMP,                       'Physically inspected. In excellent condition.'),
(1, 2, 'Bengaluru Office Floor 4', 'Pending',   NULL, NULL,                                 NULL),
(1, 3, 'Mumbai Data Center',       'Damaged',   3, CURRENT_TIMESTAMP - INTERVAL '1 day',    'Requires port replacement.')
ON CONFLICT DO NOTHING;

-- 11a. Audit Auditors
INSERT INTO audit_auditors (audit_cycle_id, user_id) VALUES
(1, 3)    -- Rudra Modi (auditor) assigned to Q3 Hardware Audit
ON CONFLICT DO NOTHING;

-- 12. Activity Log
INSERT INTO activity_log (user_id, action, entity_type, entity_id, details) VALUES
(1, 'DATABASE_SEED', 'system', NULL, 'Demo seeding loaded successfully on system installation.')
ON CONFLICT DO NOTHING;

-- 13. Notifications
INSERT INTO notifications (user_id, message, type) VALUES
(1, 'Welcome to AssetFlow. The system has automatically bootstrapped the database schema.', 'system'),
(3, 'Action Required: Q3 Hardware Audit cycle has been initialized.', 'audit')
ON CONFLICT DO NOTHING;
