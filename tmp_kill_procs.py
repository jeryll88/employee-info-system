import mysql.connector

DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": ""
}

def kill_blocking_processes():
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("SHOW PROCESSLIST")
        processes = cursor.fetchall()
        
        my_id = None
        cursor.execute("SELECT CONNECTION_ID()")
        res = cursor.fetchone()
        if res:
            my_id = res['CONNECTION_ID()']

        for p in processes:
            pid = p['Id']
            state = p['State']
            command = p['Command']
            
            # Don't kill yourself or the system users
            if pid == my_id or p['User'] == 'system user':
                continue
                
            # Kill Sleep processes or those waiting for locks
            if command == 'Sleep' or 'Waiting for table metadata lock' in state:
                print(f"Killing process {pid} (State: {state}, Command: {command})")
                try:
                    cursor.execute(f"KILL {pid}")
                except Exception as e:
                    print(f"Failed to kill {pid}: {e}")
        
        conn.commit()
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

if __name__ == '__main__':
    kill_blocking_processes()
