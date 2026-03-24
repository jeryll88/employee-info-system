import mysql.connector
import os

# Configuration (matches app.py defaults)
DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": ""
}

def init_db():
    try:
        # 1. Connect and create database
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        cursor.execute("CREATE DATABASE IF NOT EXISTS eis")
        cursor.close()
        conn.close()
        
        # 2. Connect to the new database
        DB_CONFIG["database"] = "eis"
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # 3. Load and execute schema
        schema_path = os.path.join('sql', 'mariadb_schema.sql')
        seed_path   = os.path.join('sql', 'mariadb_seed.sql')
        
        print(f"Loading schema from {schema_path}...")
        with open(schema_path, 'r') as f:
            commands = f.read().split(';')
            for cmd in commands:
                if cmd.strip():
                    cursor.execute(cmd)
        
        print(f"Loading seed from {seed_path}...")
        with open(seed_path, 'r') as f:
            commands = f.read().split(';')
            for cmd in commands:
                if cmd.strip():
                    cursor.execute(cmd)
        
        conn.commit()
        print("Database 'eis' initialized successfully with schema and seed data.")
        
    except mysql.connector.Error as err:
        print(f"Error: {err}")
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

if __name__ == "__main__":
    init_db()
