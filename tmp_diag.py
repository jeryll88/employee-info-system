import mysql.connector
import os

DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "",
    "database": "eis"
}

def diagnose():
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        cursor.execute("SHOW TABLES")
        tables = [t[0] for t in cursor.fetchall()]
        
        print(f"Tables in Database: {tables}")
        
        for table in tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            print(f"- Table '{table}': {count} rows")
            
            if table in ['leaves', 'leave_requests']:
                cursor.execute(f"DESCRIBE {table}")
                cols = cursor.fetchall()
                print(f"  Columns for {table}: {[c[0] for c in cols]}")
        
        if 'leaves' in tables and 'leave_requests' in tables:
            print("\nWARNING: Both 'leaves' and 'leave_requests' tables exist!")
        
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    diagnose()
