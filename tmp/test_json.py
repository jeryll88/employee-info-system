import mysql.connector
import os
import json
from datetime import datetime

class CustomEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASS", ""),
    "database": os.getenv("DB_NAME", "eis")
}

try:
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute('SELECT id, username, role, employee_id, created_at FROM users ORDER BY username')
    rows = cursor.fetchall()
    
    print("Fetched rows:")
    for row in rows:
        print(row)
        
    print("\nAttempting standard JSON serialization:")
    try:
        print(json.dumps(rows))
    except Exception as e:
        print(f"Standard JSON failed: {e}")
        
    print("\nAttempting Custom JSON serialization (isoformat):")
    print(json.dumps(rows, cls=CustomEncoder))
        
    cursor.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
