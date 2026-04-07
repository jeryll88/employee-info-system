import mysql.connector
import os

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASS", ""),
    "database": os.getenv("DB_NAME", "eis")
}

try:
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor(dictionary=True)
    
    print("Databases:")
    cursor.execute("SHOW DATABASES")
    for db in cursor:
        print(db)
        
    print("\nTables in 'eis':")
    cursor.execute("SHOW TABLES")
    for table in cursor:
        print(table)
        
    print("\nUsers content:")
    cursor.execute("SELECT id, username, role, employee_id FROM users")
    for row in cursor:
        print(row)
        
    cursor.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
