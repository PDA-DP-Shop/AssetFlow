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
    role VARCHAR(50) DEFAULT 'Employee', -- e.g., Employee, Manager, Admin, Auditor, Finance

    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create ENUM type for asset status if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'asset_status') THEN
        CREATE TYPE asset_status AS ENUM ('Available', 'Allocated', 'Reserved', 'Under Maintenance', 'Lost', 'Retired', 'Disposed');
    END IF;
END$$;

-- Create Sequence for formatting asset tags (e.g. AF-0001)
CREATE SEQUENCE IF NOT EXISTS asset_tag_seq START WITH 1;

-- Create function to auto-generate asset tags
CREATE OR REPLACE FUNCTION set_next_asset_tag()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.asset_tag IS NULL THEN
        NEW.asset_tag := 'AF-' || LPAD(nextval('asset_tag_seq')::text, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Assets Table
CREATE TABLE IF NOT EXISTS assets (
    id SERIAL PRIMARY KEY,
    asset_tag VARCHAR(20) UNIQUE,
    name VARCHAR(150) NOT NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE RESTRICT,
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    serial_number VARCHAR(100) UNIQUE NOT NULL,
    acquisition_date DATE DEFAULT CURRENT_DATE,
    acquisition_cost NUMERIC(12, 2),
    condition VARCHAR(100),
    location VARCHAR(150),
    photo_url TEXT,
    is_bookable BOOLEAN DEFAULT FALSE,
    status asset_status DEFAULT 'Available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Drop trigger if already exists (avoids errors when running repeatedly)
DROP TRIGGER IF EXISTS trigger_generate_asset_tag ON assets;
CREATE TRIGGER trigger_generate_asset_tag
BEFORE INSERT ON assets
FOR EACH ROW
EXECUTE FUNCTION set_next_asset_tag();

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

-- 7. Resources Table
CREATE TABLE IF NOT EXISTS resources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,       -- e.g., conference_room, server_rack, projector
    location VARCHAR(150),           -- physical location of the resource
    capacity INTEGER,                -- max simultaneous users / seats
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- booking_status ENUM
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
        CREATE TYPE booking_status AS ENUM ('Upcoming', 'Ongoing', 'Completed', 'Cancelled');
    END IF;
END$$;

-- 8. Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    booked_by   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- employee who booked
    start_time  TIMESTAMP NOT NULL,
    end_time    TIMESTAMP NOT NULL,
    purpose     VARCHAR(255),
    status      booking_status DEFAULT 'Upcoming',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT bookings_end_after_start CHECK (end_time > start_time)
);

-- Index for fast booking overlap queries: "is this resource free between T1 and T2?"
CREATE INDEX IF NOT EXISTS idx_bookings_resource_time
    ON bookings (resource_id, start_time, end_time);

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

-- audit_cycle_status ENUM
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_cycle_status') THEN
        CREATE TYPE audit_cycle_status AS ENUM ('Open', 'Closed');
    END IF;
END$$;

-- audit_item_status ENUM
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_item_status') THEN
        CREATE TYPE audit_item_status AS ENUM ('Pending', 'Verified', 'Missing', 'Damaged');
    END IF;
END$$;

-- 10. Audit Cycles Table
CREATE TABLE IF NOT EXISTS audit_cycles (
    id                   SERIAL PRIMARY KEY,
    name                 VARCHAR(100) UNIQUE NOT NULL,
    scope_department_id  INTEGER REFERENCES departments(id) ON DELETE SET NULL,  -- optional: limit scope to one dept
    scope_location       VARCHAR(150),                                            -- optional: limit scope to a location
    start_date           DATE NOT NULL,
    end_date             DATE NOT NULL,
    status               audit_cycle_status DEFAULT 'Open',
    created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT audit_cycles_end_after_start CHECK (end_date >= start_date)
);

-- 11. Audit Items Table
CREATE TABLE IF NOT EXISTS audit_items (
    id                SERIAL PRIMARY KEY,
    audit_cycle_id    INTEGER NOT NULL REFERENCES audit_cycles(id) ON DELETE CASCADE,
    asset_id          INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    expected_location VARCHAR(150),                                        -- where the asset should be
    status            audit_item_status DEFAULT 'Pending',
    verified_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,    -- auditor who verified
    verified_at       TIMESTAMP,
    notes             TEXT
);

-- 11a. Audit Auditors Join Table (many auditors per cycle)
CREATE TABLE IF NOT EXISTS audit_auditors (
    audit_cycle_id  INTEGER NOT NULL REFERENCES audit_cycles(id) ON DELETE CASCADE,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (audit_cycle_id, user_id)                                  -- prevents duplicate assignments
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
