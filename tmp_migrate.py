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
        
        # --- DANGEROUS LOGIC REMOVED TO PREVENT DATA LOSS ---
        # The following logic was dropping the 'leaves' table and replacing it with an empty 'leave_requests' table.
        # This caused existing leave requests to disappear whenever this script was run.
        
        # cursor.execute("DROP TABLE IF EXISTS leaves")
        # print("Dropped old 'leaves' table.")
        # cursor.execute("ALTER TABLE leave_requests RENAME TO leaves")
        # print("Renamed 'leave_requests' to 'leaves'.")
        
        print("Migration bypassed to protect existing data in 'leaves'.")
        
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
