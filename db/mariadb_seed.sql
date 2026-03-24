-- ============================================================
-- Employee Information System - MariaDB Seed Data
-- ============================================================

-- Seed Default Admin
INSERT IGNORE INTO users (username, password, role, employee_id)
VALUES ('admin', 'admin123', 'admin', NULL);

-- Seed Default HR User
INSERT IGNORE INTO users (username, password, role, employee_id)
VALUES ('hr_admin', 'hr123', 'hr', NULL);

-- Seed existing employees if needed (preserving constraint: no new employees)
-- This file will be used to initialize the MariaDB instance with the baseline account.
