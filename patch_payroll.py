import mysql.connector

DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "",
    "database": "eis"
}

def patch_payroll():
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        print("Checking payroll_records columns...")
        cursor.execute("DESCRIBE payroll_records")
        columns = [c[0] for t in [cursor.fetchall()] for c in t]
        
        if 'employee_name' not in columns:
            print("Adding 'employee_name' to payroll_records...")
            cursor.execute("ALTER TABLE payroll_records ADD COLUMN employee_name VARCHAR(255) AFTER employee_id")
        
        if 'leave_deductions' not in columns:
            print("Adding 'leave_deductions' to payroll_records...")
            cursor.execute("ALTER TABLE payroll_records ADD COLUMN leave_deductions DECIMAL(12,2) DEFAULT 0 AFTER deductions")

        conn.commit()
        print("Patch successful.")
        
        # Try to fill employee_name for old records
        print("Updating old records with employee names...")
        cursor.execute("""
            UPDATE payroll_records p 
            JOIN employees e ON p.employee_id = e.id 
            SET p.employee_name = CONCAT(e.first_name, ' ', e.last_name)
            WHERE p.employee_name IS NULL OR p.employee_name = ''
        """)
        conn.commit()
        print(f"Updated {cursor.rowcount} records.")

    except Exception as e:
        print(f"Patch failed: {e}")
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

if __name__ == '__main__':
    patch_payroll()
