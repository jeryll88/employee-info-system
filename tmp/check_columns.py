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
    
    print("Columns in 'users':")
    cursor.execute("DESCRIBE users")
    for col in cursor:
        print(col)
        
    cursor.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
