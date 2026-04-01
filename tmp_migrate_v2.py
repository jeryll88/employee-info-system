import mysql.connector
import time

DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "",
    "database": "eis"
}

def run_migration():
    conn = None
    try:
        print("Connecting to DB...")
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        print("Connected.")
        
        # Check tables
        cursor.execute("SHOW TABLES")
        tables = [t[0] for t in cursor.fetchall()]
        print(f"Current tables: {tables}")

        if 'leave_requests' not in tables:
            print("Table 'leave_requests' not found. Already migrated?")
            return

        # Prepare for migration
        print("Starting migration...")
        
        if 'leaves' in tables:
            print("Dropping old 'leaves' table...")
            cursor.execute("DROP TABLE IF EXISTS leaves")
            print("Dropped.")

        print("Renaming 'leave_requests' to 'leaves'...")
        cursor.execute("ALTER TABLE leave_requests RENAME TO leaves")
        print("Renamed.")
        
        conn.commit()
        print("Migration Successful.")
    except mysql.connector.Error as err:
        print(f"SQL Error: {err}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if conn and conn.is_connected():
            cursor.close()
            conn.close()
            print("Connection closed.")

if __name__ == '__main__':
    run_migration()
