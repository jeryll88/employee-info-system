import mysql.connector

DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "",
    "database": "eis"
}
conn = mysql.connector.connect(**DB_CONFIG)
cursor = conn.cursor()

# CONSISTENCY FIX: Use 'leaves' table exclusively.
cursor.execute('''
CREATE TABLE IF NOT EXISTS leaves (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id VARCHAR(255) NOT NULL,
    leave_type VARCHAR(50) NOT NULL,
    date_from DATE NOT NULL,
    date_to DATE NOT NULL,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'Pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_leaves_employee_patch FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB;
''')
conn.commit()
print("Leaves table checked/created.")
