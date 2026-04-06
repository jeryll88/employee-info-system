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
    cursor = conn.cursor()
    cursor.execute("SHOW TABLES;")
    tables = cursor.fetchall()
    print("Tables found in 'eis':")
    for table in tables:
        print(f" - {table[0]}")
    conn.close()
except Exception as e:
    print(f"Failed to connect to MariaDB 'eis': {e}")
