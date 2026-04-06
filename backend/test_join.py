import mysql.connector
import os

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASS", ""),
    "database": "eis"
}

try:
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor(dictionary=True)
    
    print("Testing JOIN query...")
    cursor.execute('''
        SELECT a.*, e.first_name, e.last_name 
        FROM attendance a
        JOIN employees e ON a.employee_id = e.id
        ORDER BY a.attendance_date DESC, a.time_in DESC
        LIMIT 5
    ''')
    rows = cursor.fetchall()
    print(f"Query returned {len(rows)} rows.")
    for r in rows:
        print(f" - {r['attendance_date']} | {r['first_name']} {r['last_name']} | {r['time_in']}")
    
    conn.close()
except Exception as e:
    print(f"Query failed: {e}")
