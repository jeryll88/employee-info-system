import mysql.connector
import os

DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "",
    "database": "eis"
}

def sync_db():
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # 1. Rename columns to match code
        print("Changing start_date to date_from...")
        cursor.execute("ALTER TABLE leaves CHANGE start_date date_from DATE NOT NULL;")
        
        print("Changing end_date to date_to...")
        cursor.execute("ALTER TABLE leaves CHANGE end_date date_to DATE NOT NULL;")
        
        # 2. Update status and type for flexibility
        print("Updating leave_type and status types...")
        cursor.execute("ALTER TABLE leaves MODIFY leave_type VARCHAR(50) NOT NULL;")
        cursor.execute("ALTER TABLE leaves MODIFY status VARCHAR(50) DEFAULT 'Pending';")
        
        conn.commit()
        print("MariaDB schema synchronized successfully.")
        
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error during synchronization: {e}")

if __name__ == "__main__":
    sync_db()
