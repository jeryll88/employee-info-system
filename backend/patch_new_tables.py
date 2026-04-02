"""
patch_new_tables.py
Run this script to add payroll_records and notifications tables to the DB.
Usage: python backend/patch_new_tables.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Load DB config from app.py environment
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASS", ""),
    "database": os.getenv("DB_NAME", "eis")
}

import mysql.connector

def run():
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor()

    statements = [
        """
        CREATE TABLE IF NOT EXISTS payroll_records (
            id INT AUTO_INCREMENT PRIMARY KEY,
            employee_id VARCHAR(255) NOT NULL,
            employee_name VARCHAR(255),
            period_month INT NOT NULL,
            period_year INT NOT NULL,
            base_salary DECIMAL(12,2) DEFAULT 0,
            allowance DECIMAL(12,2) DEFAULT 0,
            deductions DECIMAL(12,2) DEFAULT 0,
            leave_deductions DECIMAL(12,2) DEFAULT 0,
            tax DECIMAL(12,2) DEFAULT 0,
            net_salary DECIMAL(12,2) DEFAULT 0,
            work_days INT DEFAULT 0,
            generated_by VARCHAR(255),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_payroll_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
        ) ENGINE=InnoDB
        """,
        """
        CREATE TABLE IF NOT EXISTS notifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            employee_id VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            is_read TINYINT(1) DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_notif_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
        ) ENGINE=InnoDB
        """
    ]

    for sql in statements:
        try:
            cursor.execute(sql)
            print("OK:", sql.strip()[:60])
        except mysql.connector.Error as e:
            print(f"Error: {e}")

    conn.commit()
    cursor.close()
    conn.close()
    print("\n✅ Migration complete.")

if __name__ == '__main__':
    run()
