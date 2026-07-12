-- AssetFlow Database DDL Schema

-- 1. Departments Table
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    manager VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Users Table (Represents Employees & Users)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'employee', -- e.g., employee, manager, admin, auditor, finance
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Assets Table
CREATE TABLE IF NOT EXISTS assets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    serial_number VARCHAR(100) UNIQUE NOT NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE RESTRICT,
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'available', -- e.g., available, allocated, maintenance, retired
    purchase_date DATE,
    purchase_cost NUMERIC(12, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Allocations Table
CREATE TABLE IF NOT EXISTS allocations (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    allocated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    returned_at TIMESTAMP,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'active' -- e.g., active, returned
);

-- 6. Transfers Table
CREATE TABLE IF NOT EXISTS transfers (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
    from_department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    to_department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    transfer_date TIMESTAMP,
    approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'pending' -- e.g., pending, approved, rejected
);

-- 7. Resources Table (Shared assets/rooms/etc)
CREATE TABLE IF NOT EXISTS resources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL, -- e.g., conference_room, server_rack, testing_device
    description TEXT,
    capacity INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    resource_id INTEGER REFERENCES resources(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    purpose VARCHAR(255),
    status VARCHAR(50) DEFAULT 'confirmed', -- e.g., confirmed, cancelled, completed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Maintenance Requests Table
CREATE TABLE IF NOT EXISTS maintenance_requests (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
    reported_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium', -- e.g., low, medium, high, critical
    status VARCHAR(50) DEFAULT 'pending', -- e.g., pending, in_progress, completed, cancelled
    cost NUMERIC(10, 2),
    scheduled_date DATE,
    completed_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Audit Cycles Table
CREATE TABLE IF NOT EXISTS audit_cycles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'active', -- e.g., active, completed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Audit Items Table
CREATE TABLE IF NOT EXISTS audit_items (
    id SERIAL PRIMARY KEY,
    audit_cycle_id INTEGER REFERENCES audit_cycles(id) ON DELETE CASCADE,
    asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending', -- e.g., pending, verified, missing, damaged
    audited_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    audited_at TIMESTAMP,
    notes TEXT
);

-- 12. Activity Log Table
CREATE TABLE IF NOT EXISTS activity_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- e.g., ASSET_CREATE, ALLOCATION_CREATE, AUDIT_COMPLETE
    entity_type VARCHAR(50) NOT NULL, -- e.g., assets, users, audits
    entity_id INTEGER,
    details TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'general', -- e.g., alert, assignment, audit, system
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
