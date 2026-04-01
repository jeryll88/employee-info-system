import mysql.connector

DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "",
    "database": "eis"
}

def run_migration():
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # Check if leave_requests exists
        cursor.execute("SHOW TABLES LIKE 'leave_requests'")
        if not cursor.fetchone():
            print("Table 'leave_requests' for renaming not found. Already migrated?")
            return

        # Drop old leaves table if exists
        cursor.execute("DROP TABLE IF EXISTS leaves")
        print("Dropped old 'leaves' table.")
        
        # Rename leave_requests to leaves
        cursor.execute("ALTER TABLE leave_requests RENAME TO leaves")
        print("Renamed 'leave_requests' to 'leaves'.")
        
        conn.commit()
        print("Migration Successful.")
    except Exception as e:
        print(f"Migration failed: {e}")
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

if __name__ == '__main__':
    run_migration()
