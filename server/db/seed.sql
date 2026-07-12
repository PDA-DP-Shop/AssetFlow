-- AssetFlow Seeding Script

-- 1. Departments
INSERT INTO departments (name, code, manager) VALUES
('Engineering', 'ENG', 'Alice Vance'),
('IT Operations', 'IT', 'Bob Smith'),
('Marketing', 'MKT', 'Charlotte Webb'),
('Sales', 'SLS', 'David Miller'),
('Human Resources', 'HR', 'Emma Watson')
ON CONFLICT (name) DO NOTHING;

-- 2. Categories
INSERT INTO categories (name, description) VALUES
('Computing', 'Laptops, desktops, workstation towers, and servers'),
('Displays', 'Monitors, projectors, and digital display boards'),
('Networking', 'Routers, switches, access points, and hardware firewalls'),
('Furniture', 'Ergonomic chairs, sit-stand desks, and conference tables'),
('Testing Devices', 'Smartphones, tablets, and test benches for hardware testing')
ON CONFLICT (name) DO NOTHING;

-- 3. Users (Password hashes correspond to 'AssetFlow@2026')
INSERT INTO users (name, email, password_hash, role, department_id) VALUES
('AssetFlow Administrator', 'admin@assetflow.com', '$2b$10$vPz7D3lqfGleF8aTiw4.uO3uGj8aP5Ksz3e/t/yJ88.lT2H1LzWze', 'Admin', 2),
('John Auditor', 'auditor@assetflow.com', '$2b$10$vPz7D3lqfGleF8aTiw4.uO3uGj8aP5Ksz3e/t/yJ88.lT2H1LzWze', 'Auditor', 2),
('Alice Vance', 'alice@assetflow.com', '$2b$10$vPz7D3lqfGleF8aTiw4.uO3uGj8aP5Ksz3e/t/yJ88.lT2H1LzWze', 'Manager', 1),
('Emily Employee', 'emily@assetflow.com', '$2b$10$vPz7D3lqfGleF8aTiw4.uO3uGj8aP5Ksz3e/t/yJ88.lT2H1LzWze', 'Employee', 1),
('David Miller', 'david@assetflow.com', '$2b$10$vPz7D3lqfGleF8aTiw4.uO3uGj8aP5Ksz3e/t/yJ88.lT2H1LzWze', 'Manager', 4)
ON CONFLICT (email) DO NOTHING;

-- 4. Assets
INSERT INTO assets (name, serial_number, category_id, department_id, status, acquisition_date, acquisition_cost, condition, location, is_bookable) VALUES
('MacBook Pro 16" M3 Max', 'SN-M3MAX-88219', 1, 1, 'Allocated', '2026-01-10', 3499.00, 'Excellent', 'Main Office Floor 2', false),
('Dell UltraSharp 32" 4K Monitor', 'SN-DELL4K-00293', 2, 1, 'Available', '2026-02-15', 899.00, 'Good', 'Main Office Floor 2', false),
('Cisco Catalyst 9300 Switch', 'SN-CISCO-9300X', 3, 2, 'Under Maintenance', '2025-11-20', 4500.00, 'Requires Service', 'Server Room A', false),
('iPad Pro 12.9" Cellular', 'SN-IPADPRO-90082', 5, 4, 'Allocated', '2026-03-01', 1299.00, 'Excellent', 'Sales Floor 1', true),
('Herman Miller Aeron Chair', 'SN-AERON-55610', 4, 5, 'Allocated', '2024-06-18', 1450.00, 'Good', 'HR Department', false),
('Testbench iPhone 15 Pro', 'SN-IPHONE15-2234', 5, 1, 'Available', '2025-10-05', 999.00, 'Fair', 'Mobile Test Lab', true)
ON CONFLICT (serial_number) DO NOTHING;

-- 5. Allocations
INSERT INTO allocations (asset_id, user_id, notes, status) VALUES
(1, 4, 'Assigned to Emily for software engineering work.', 'active'),
(4, 5, 'Assigned to David for field client presentations.', 'active'),
(5, 1, 'Standard admin desk configuration.', 'active')
ON CONFLICT DO NOTHING;

-- 6. Transfers
INSERT INTO transfers (asset_id, from_department_id, to_department_id, status, approved_by) VALUES
(1, 2, 1, 'approved', 1)
ON CONFLICT DO NOTHING;

-- 7. Resources
INSERT INTO resources (name, type, location, capacity) VALUES
('Conference Room Alpha', 'conference_room', 'HQ Building A, Floor 3', 16),
('Staging Rack 3B', 'server_rack', 'Server Room A', 10),
('iOS Testing Kit 1', 'testing_device', 'Mobile Test Lab', 1)
ON CONFLICT DO NOTHING;

-- 8. Bookings
INSERT INTO bookings (resource_id, booked_by, start_time, end_time, purpose, status) VALUES
(1, 3, CURRENT_TIMESTAMP + INTERVAL '1 hour',  CURRENT_TIMESTAMP + INTERVAL '2 hours', 'Sprint Review Planning', 'Upcoming'),
(2, 4, CURRENT_TIMESTAMP + INTERVAL '1 day',   CURRENT_TIMESTAMP + INTERVAL '3 days',  'Server benchmark runs',  'Upcoming')
ON CONFLICT DO NOTHING;

-- 9. Maintenance Requests
INSERT INTO maintenance_requests (asset_id, reported_by, description, priority, status, cost, scheduled_date) VALUES
(3, 1, 'Switch Port 24 experiencing packet drop and physical port damage.', 'high', 'in_progress', 350.00, '2026-07-15')
ON CONFLICT DO NOTHING;

-- 10. Audit Cycles
INSERT INTO audit_cycles (name, scope_department_id, scope_location, start_date, end_date, status) VALUES
('Q3 Hardware Audit', 1, 'Main Office Floor 2', '2026-07-01', '2026-07-31', 'Open')
ON CONFLICT (name) DO NOTHING;

-- 11. Audit Items
INSERT INTO audit_items (audit_cycle_id, asset_id, expected_location, status, verified_by, verified_at, notes) VALUES
(1, 1, 'Main Office Floor 2', 'Verified',  2, CURRENT_TIMESTAMP,                       'Physically inspected. In excellent condition.'),
(1, 2, 'Main Office Floor 2', 'Pending',   NULL, NULL,                                 NULL),
(1, 3, 'Server Room A',       'Damaged',   2, CURRENT_TIMESTAMP - INTERVAL '1 day',    'Requires port replacement.')
ON CONFLICT DO NOTHING;

-- 11a. Audit Auditors
INSERT INTO audit_auditors (audit_cycle_id, user_id) VALUES
(1, 2),   -- John Auditor assigned to Q3 Hardware Audit
(1, 3)    -- Alice Vance (manager) also assigned
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
