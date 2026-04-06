import mysql.connector

DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "",
    "database": "eis"
}

def recreate_leaves_table():
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # 1. Drop the table if it exists
        cursor.execute("DROP TABLE IF EXISTS leaves")
        print("Dropped old 'leaves' table.")
        
        # 2. Recreate with correct schema
        schema = '''
        CREATE TABLE leaves (
            id INT AUTO_INCREMENT PRIMARY KEY,
            employee_id VARCHAR(255) NOT NULL,
            leave_type VARCHAR(50) NOT NULL,
            date_from DATE NOT NULL,
            date_to DATE NOT NULL,
            reason TEXT,
            status VARCHAR(50) DEFAULT 'Pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_leaves_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
        ) ENGINE=InnoDB;
        '''
        cursor.execute(schema)
        print("Recreated 'leaves' table with correct columns.")
        
        conn.commit()
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

if __name__ == '__main__':
    recreate_leaves_table()
