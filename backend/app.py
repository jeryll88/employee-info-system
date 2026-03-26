from flask import Flask, send_from_directory, jsonify, request, session
from flask_cors import CORS
import mysql.connector
from mysql.connector import pooling
import os
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, '..', 'frontend')

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path='')
app.secret_key = "eis_secret_key_2026"

# CORS: Allow same origin and browser defaults
CORS(app, supports_credentials=True, origins=[
    "http://localhost:5000",
    "http://127.0.0.1:5000",
    "http://localhost",
    "http://127.0.0.1",
    "null" # For file-based access during transition
])

# ─── MariaDB Configuration ─────────────────────────────────────
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASS", ""),
    "database": os.getenv("DB_NAME", "eis")
}

# Connection Pool
try:
    db_pool = pooling.MySQLConnectionPool(
        pool_name="eis_pool",
        pool_size=5,
        **DB_CONFIG
    )
except Exception as e:
    print(f"Error creating DB pool: {e}")

def get_db():
    try:
        conn = db_pool.get_connection()
        return conn
    except Exception as e:
        print(f"Error getting connection: {e}")
        return None

def init_db():
    schema_path = os.path.join(BASE_DIR, '..', 'db', 'mariadb_schema.sql')
    seed_path   = os.path.join(BASE_DIR, '..', 'db', 'mariadb_seed.sql')
    
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor()
    
    try:
        with open(schema_path, 'r') as f:
            # MariaDB executescript alternative: split by ';'
            commands = f.read().split(';')
            for cmd in commands:
                if cmd.strip():
                    cursor.execute(cmd)
        
        with open(seed_path, 'r') as f:
            commands = f.read().split(';')
            for cmd in commands:
                if cmd.strip():
                    cursor.execute(cmd)
        
        conn.commit()
        print("MariaDB initialized successfully.")
    except Exception as e:
        print(f"Error initializing MariaDB: {e}")
    finally:
        cursor.close()
        conn.close()

# ─── Routes ───────────────────────────────────────────────────
@app.route('/')
def index():
    return app.send_static_file('login.html')

# Blueprints will follow

# ─── Register blueprints ───────────────────────────────────────
from auth      import auth_bp
from employees import employees_bp
from leave     import leave_bp
from records   import records_bp

app.register_blueprint(auth_bp)
app.register_blueprint(employees_bp)
app.register_blueprint(leave_bp)
app.register_blueprint(records_bp)

# ─── Run ───────────────────────────────────────────────────────
if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5000)
