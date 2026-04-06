import mysql.connector
from mysql.connector import pooling
import os

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASS", ""),
    "database": os.getenv("DB_NAME", "eis")
}

try:
    print(f"Attempting to create pool with config: {DB_CONFIG}")
    db_pool = pooling.MySQLConnectionPool(
        pool_name="eis_pool_test",
        pool_size=5,
        **DB_CONFIG
    )
    print("Pool created successfully.")
    conn = db_pool.get_connection()
    print("Connection retrieved from pool.")
    conn.close()
    print("Connection returned to pool.")
except Exception as e:
    print(f"Error testing DB pool: {e}")
    import traceback
    traceback.print_exc()
