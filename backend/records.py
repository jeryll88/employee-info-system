from flask import Blueprint, request, jsonify, session
import sys, os
from datetime import date, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from auth import require_role, require_auth

records_bp = Blueprint('records', __name__)

def get_db():
    from app import get_db as _get_db
    return _get_db()

def serialize_dates(row):
    """Convert date/datetime/timedelta objects to strings for JSON serialization."""
    if not row:
        return row
    from datetime import timedelta
    for key, val in row.items():
        if isinstance(val, (date, datetime)):
            row[key] = val.isoformat()
        elif isinstance(val, timedelta):
            # Format timedelta as HH:MM:SS string
            total_seconds = int(val.total_seconds())
            hours, remainder = divmod(total_seconds, 3600)
            minutes, seconds = divmod(remainder, 60)
            row[key] = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
    return row

# ─── Trainings ───────────────────────────────────────────────
@records_bp.route('/api/trainings', methods=['GET'])
@require_auth
def get_trainings():
    emp_id = request.args.get('employee_id') or session['user'].get('employee_id')
    if not emp_id: return jsonify({'error': 'employee_id required'}), 400
    
    conn = get_db()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
        
    cursor = conn.cursor(dictionary=True)
    cursor.execute('SELECT * FROM trainings WHERE employee_id = %s ORDER BY training_date DESC', (emp_id,))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify([serialize_dates(r) for r in rows])

@records_bp.route('/api/trainings', methods=['POST'])
@require_role('admin', 'hr')
def add_training():
    data = request.get_json()
    emp_id = data.get('employee_id')
    title  = data.get('title')
    t_date = data.get('training_date')

    if not all([emp_id, title, t_date]):
        return jsonify({'error': 'Missing fields'}), 400

    conn = get_db()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
        
    cursor = conn.cursor()
    cursor.execute('INSERT INTO trainings (employee_id, title, training_date) VALUES (%s, %s, %s)', (emp_id, title, t_date))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Training added'}), 201

@records_bp.route('/api/trainings/<int:id>', methods=['DELETE'])
@require_role('admin')
def delete_training(id):
    conn = get_db()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
        
    cursor = conn.cursor()
    cursor.execute('DELETE FROM trainings WHERE id = %s', (id,))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Training deleted'})

@records_bp.route('/api/trainings/<int:id>', methods=['GET'])
@require_auth
def get_training(id):
    conn = get_db()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
        
    cursor = conn.cursor(dictionary=True)
    cursor.execute('SELECT * FROM trainings WHERE id = %s', (id,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    if not row: return jsonify({'error': 'Training not found'}), 404
    return jsonify(serialize_dates(row))

@records_bp.route('/api/trainings/<int:id>', methods=['PUT'])
@require_role('admin', 'hr')
def update_training(id):
    data = request.get_json()
    conn = get_db()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
        
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE trainings SET title = %s, training_date = %s
        WHERE id = %s
    ''', (data.get('title'), data.get('training_date'), id))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Training updated'})

# ─── Service Records ─────────────────────────────────────────
@records_bp.route('/api/service_records', methods=['GET'])
@require_auth
def get_service_records():
    emp_id = request.args.get('employee_id') or session['user'].get('employee_id')
    if not emp_id: return jsonify({'error': 'employee_id required'}), 400
    
    conn = get_db()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
        
    cursor = conn.cursor(dictionary=True)
    cursor.execute('SELECT * FROM service_records WHERE employee_id = %s ORDER BY date_from DESC', (emp_id,))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify([serialize_dates(r) for r in rows])

@records_bp.route('/api/service_records', methods=['POST'])
@require_role('admin', 'hr')
def add_service_record():
    data = request.get_json()
    emp_id = data.get('employee_id')
    designation = data.get('designation')
    
    if not emp_id or not designation:
        return jsonify({'error': 'Employee ID and Designation are required'}), 400

    conn = get_db()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
        
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO service_records (employee_id, designation, status, salary_range, station, date_from, date_to, remarks)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    ''', (
        emp_id, designation, data.get('status'), data.get('salary_range'),
        data.get('station'), data.get('date_from'), data.get('date_to'), data.get('remarks')
    ))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Service record added'}), 201

@records_bp.route('/api/service_records/<int:id>', methods=['GET'])
@require_auth
def get_service_record(id):
    conn = get_db()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
        
    cursor = conn.cursor(dictionary=True)
    cursor.execute('SELECT * FROM service_records WHERE id = %s', (id,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    if not row: return jsonify({'error': 'Record not found'}), 404
    return jsonify(serialize_dates(row))

@records_bp.route('/api/service_records/<int:id>', methods=['PUT'])
@require_role('admin', 'hr')
def update_service_record(id):
    data = request.get_json()
    conn = get_db()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
        
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE service_records SET
            designation = %s, status = %s, salary_range = %s, station = %s, 
            date_from = %s, date_to = %s, remarks = %s
        WHERE id = %s
    ''', (
        data.get('designation'), data.get('status'), data.get('salary_range'),
        data.get('station'), data.get('date_from'), data.get('date_to'),
        data.get('remarks'), id
    ))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Record updated'})

@records_bp.route('/api/service_records/<int:id>', methods=['DELETE'])
@require_role('admin')
def delete_service_record(id):
    conn = get_db()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
        
    cursor = conn.cursor()
    cursor.execute('DELETE FROM service_records WHERE id = %s', (id,))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Record deleted'})

# ─── Attendance ─────────────────────────────────────────────
@records_bp.route('/api/attendance', methods=['GET'])
@require_auth
def get_attendance():
    role   = session['user']['role']
    emp_id = request.args.get('employee_id')
    
    conn = get_db()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
        
    cursor = conn.cursor(dictionary=True)
    
    try:
        if role in ('admin', 'hr'):
            if emp_id:
                # Specific employee
                cursor.execute('''
                    SELECT a.*, e.first_name, e.last_name 
                    FROM attendance a
                    JOIN employees e ON a.employee_id = e.id
                    WHERE a.employee_id = %s 
                    ORDER BY a.attendance_date DESC
                ''', (emp_id,))
            else:
                # All staff
                cursor.execute('''
                    SELECT a.*, e.first_name, e.last_name 
                    FROM attendance a
                    JOIN employees e ON a.employee_id = e.id
                    ORDER BY a.attendance_date DESC, a.time_in DESC
                    LIMIT 200
                ''')
        else:
            # Employee: own records only
            my_emp_id = session['user'].get('employee_id')
            cursor.execute('''
                SELECT a.*, e.first_name, e.last_name 
                FROM attendance a
                JOIN employees e ON a.employee_id = e.id
                WHERE a.employee_id = %s 
                ORDER BY a.attendance_date DESC
            ''', (my_emp_id,))
            
        rows = cursor.fetchall()
        return jsonify([serialize_dates(r) for r in rows])
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@records_bp.route('/api/attendance/today', methods=['GET'])
@require_auth
def get_today_attendance():
    """Returns today's attendance record for the current employee."""
    emp_id = session['user'].get('employee_id')
    if not emp_id:
        return jsonify({'error': 'Not linked to employee'}), 400

    today = datetime.now().date().isoformat()
    conn = get_db()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        'SELECT * FROM attendance WHERE employee_id = %s AND attendance_date = %s',
        (emp_id, today)
    )
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    return jsonify(serialize_dates(row) if row else {})

@records_bp.route('/api/attendance', methods=['POST'])
@require_auth
def log_attendance():
    data    = request.get_json()
    role    = session['user']['role']
    emp_id  = data.get('employee_id') if role in ('admin', 'hr') else session['user'].get('employee_id')
    
    if not emp_id: return jsonify({'error': 'Employee ID required'}), 400
    
    a_date = data.get('attendance_date')
    t_in   = data.get('time_in')
    t_out  = data.get('time_out')

    conn = get_db()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
        
    cursor = conn.cursor(dictionary=True)
    cursor.execute('SELECT id FROM attendance WHERE employee_id = %s AND attendance_date = %s', (emp_id, a_date))
    existing = cursor.fetchone()
    if existing:
        cursor.execute('UPDATE attendance SET time_in = %s, time_out = %s WHERE id = %s', (t_in, t_out, existing['id']))
    else:
        cursor.execute('INSERT INTO attendance (employee_id, attendance_date, time_in, time_out) VALUES (%s, %s, %s, %s)', (emp_id, a_date, t_in, t_out))
    
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Attendance logged'})

@records_bp.route('/api/attendance/checkout', methods=['PUT'])
@require_auth
def checkout_attendance():
    """Checks out the employee for today, recording time_out."""
    emp_id = session['user'].get('employee_id')
    if not emp_id:
        return jsonify({'error': 'Not linked to employee'}), 400

    now = datetime.now()
    today = now.date().isoformat()
    time_out = now.strftime('%H:%M:%S')

    conn = get_db()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        'SELECT id FROM attendance WHERE employee_id = %s AND attendance_date = %s',
        (emp_id, today)
    )
    existing = cursor.fetchone()
    if not existing:
        cursor.close()
        conn.close()
        return jsonify({'error': 'No check-in found for today. Please check in first.'}), 400

    cursor.execute('UPDATE attendance SET time_out = %s WHERE id = %s', (time_out, existing['id']))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Checked out successfully', 'time_out': time_out})

# ─── Payroll ───────────────────────────────────────────────
@records_bp.route('/api/payroll', methods=['GET'])
@require_auth
def get_payroll_history():
    """Returns payslip history. Employee sees own; admin/hr can filter by employee_id."""
    role = session['user']['role']
    emp_id = request.args.get('employee_id') or session['user'].get('employee_id')

    if role == 'employee':
        emp_id = session['user'].get('employee_id')
        if not emp_id:
            return jsonify({'error': 'Account not linked to employee'}), 400

    conn = get_db()
    if not conn: return jsonify({'error': 'Database connection failed'}), 500
    cursor = conn.cursor(dictionary=True)

    if role in ('admin', 'hr') and emp_id:
        cursor.execute(
            'SELECT * FROM payroll_records WHERE employee_id = %s ORDER BY created_at DESC',
            (emp_id,)
        )
    elif role in ('admin', 'hr'):
        cursor.execute('SELECT * FROM payroll_records ORDER BY created_at DESC LIMIT 50')
    else:
        cursor.execute(
            'SELECT * FROM payroll_records WHERE employee_id = %s ORDER BY created_at DESC',
            (emp_id,)
        )

    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify([serialize_dates(r) for r in rows])

@records_bp.route('/api/payroll/generate', methods=['POST'])
@require_role('admin', 'hr')
def generate_payroll():
    data = request.get_json()
    emp_id = data.get('employee_id')
    if not emp_id: return jsonify({'error': 'Employee ID required'}), 400
    
    conn = get_db()
    if not conn: return jsonify({'error': 'Database connection failed'}), 500
    cursor = conn.cursor(dictionary=True)
    
    try:
        # Get employee name
        cursor.execute("SELECT first_name, last_name FROM employees WHERE id = %s", (emp_id,))
        emp_record = cursor.fetchone()
        employee_name = f"{emp_record['first_name']} {emp_record['last_name']}" if emp_record else "Unknown Employee"

        # 1. Get latest service record for salary
        cursor.execute('''
            SELECT salary_range FROM service_records 
            WHERE employee_id = %s 
            ORDER BY date_from DESC LIMIT 1
        ''', (emp_id,))
        record = cursor.fetchone()
        
        base_salary = 0.0
        if record and record['salary_range']:
            salary_str = record['salary_range'].split('-')[0].replace(',', '').strip()
            try:
                base_salary = float(salary_str)
            except:
                base_salary = 20000.0
        else:
            base_salary = 20000.0
            
        # 2. Get attendance and leaves for current month
        now = datetime.now()
        cursor.execute('''
            SELECT COUNT(*) as days FROM attendance 
            WHERE employee_id = %s 
            AND MONTH(attendance_date) = %s 
            AND YEAR(attendance_date) = %s
        ''', (emp_id, now.month, now.year))
        attendance = cursor.fetchone()
        work_days = attendance['days'] if attendance else 0

        # --- Refined Leave Deduction Logic ---
        # Deduct for ALL approved leaves in the current month
        cursor.execute('''
            SELECT SUM(DATEDIFF(date_to, date_from) + 1) as leave_days
            FROM leaves
            WHERE employee_id = %s AND status = 'Approved'
            AND YEAR(date_from) = %s AND MONTH(date_from) = %s
        ''', (emp_id, now.year, now.month))
        leave_data = cursor.fetchone()
        approved_leave_days = int(leave_data['leave_days'] or 0)

        # 3. Calculation
        allowance = work_days * 100.0
        deductions = 500.0
        daily_rate = base_salary / 22.0
        leave_deductions = round(daily_rate * approved_leave_days, 2)
        tax = base_salary * 0.10
        net_salary = base_salary + allowance - deductions - leave_deductions - tax

        # 4. Save payslip record to DB
        generated_by = session['user'].get('username', 'system')
        cursor2 = conn.cursor()
        cursor2.execute('''
            INSERT INTO payroll_records 
                (employee_id, employee_name, period_month, period_year, base_salary, allowance, deductions, leave_deductions, tax, net_salary, work_days, generated_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ''', (
            emp_id, employee_name, now.month, now.year,
            round(base_salary, 2), round(allowance, 2),
            round(deductions, 2), leave_deductions, round(tax, 2), round(net_salary, 2),
            work_days, generated_by
        ))
        conn.commit()
        cursor2.close()

        # 5. Notify the employee
        month_name = now.strftime('%B %Y')
        _notify_employee(conn, emp_id, f"Your payslip for {month_name} has been generated. Net Pay: PHP {net_salary:,.2f}")

        return jsonify({
            'employee_id': emp_id,
            'employee_name': employee_name,
            'base_salary': f"{base_salary:,.2f}",
            'work_days': work_days,
            'allowance': f"{allowance:,.2f}",
            'deductions': f"{deductions:,.2f}",
            'leave_deductions': f"{leave_deductions:,.2f}",
            'tax': f"{tax:,.2f}",
            'net_salary': f"{net_salary:,.2f}",
            'currency': 'PHP',
            'period': now.strftime('%B %Y')
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# ─── Leave Requests ──────────────────────────────────────────
@records_bp.route('/api/leave', methods=['GET'])
@require_auth
def get_leaves():
    role = session['user']['role']
    emp_id = session['user'].get('employee_id')
    
    conn = get_db()
    if not conn: return jsonify({'error': 'DB error'}), 500
    cursor = conn.cursor(dictionary=True)
    
    if role in ('admin', 'hr'):
        cursor.execute('SELECT * FROM leaves ORDER BY created_at DESC')
    else:
        cursor.execute('SELECT * FROM leaves WHERE employee_id = %s ORDER BY created_at DESC', (emp_id,))
        
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify([serialize_dates(r) for r in rows])

@records_bp.route('/api/leave', methods=['POST'])
@require_auth
def file_leave():
    data = request.get_json()
    emp_id = session['user'].get('employee_id')
    if not emp_id: return jsonify({'error': 'Account not linked to an employee'}), 400
    
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO leaves (employee_id, leave_type, date_from, date_to, reason, status)
            VALUES (%s, %s, %s, %s, %s, 'Pending')
        ''', (emp_id, data.get('leave_type'), data.get('date_from'), data.get('date_to'), data.get('reason')))
        conn.commit()
    except Exception as e:
        return jsonify({'error': 'Failed to process request (are details valid?)'}), 400
    finally:
        cursor.close()
        conn.close()
    return jsonify({'message': 'Leave request submitted'}), 201

@records_bp.route('/api/leave/<int:leave_id>', methods=['PUT'])
@require_role('admin', 'hr')
def update_leave(leave_id):
    data = request.get_json()
    new_status = data.get('status')
    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    # Get leave info for notification
    cursor.execute('SELECT * FROM leaves WHERE id = %s', (leave_id,))
    leave = cursor.fetchone()

    cursor2 = conn.cursor()
    cursor2.execute('UPDATE leaves SET status = %s WHERE id = %s', (new_status, leave_id))
    conn.commit()
    cursor2.close()

    # Send notification to employee
    if leave and new_status in ('Approved', 'Rejected'):
        icon = '✅' if new_status == 'Approved' else '❌'
        msg = f"{icon} Your {leave['leave_type']} request ({leave['date_from']} – {leave['date_to']}) has been {new_status}."
        _notify_employee(conn, leave['employee_id'], msg)

    cursor.close()
    conn.close()
    return jsonify({'message': f'Leave {new_status}'})

@records_bp.route('/api/leave/balance', methods=['GET'])
@require_auth
def leave_balance():
    emp_id = session['user'].get('employee_id')
    if not emp_id: return jsonify({'sick_leave': 0, 'vacation_leave': 0})
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute('''
        SELECT SUM(DATEDIFF(date_to, date_from) + 1) as used 
        FROM leaves 
        WHERE employee_id = %s AND leave_type = 'Sick' AND status = 'Approved'
    ''', (emp_id,))
    row1 = cursor.fetchone()
    sick_used = int(row1['used'] or 0)
    
    cursor.execute('''
        SELECT SUM(DATEDIFF(date_to, date_from) + 1) as used 
        FROM leaves 
        WHERE employee_id = %s AND leave_type = 'Vacation' AND status = 'Approved'
    ''', (emp_id,))
    row2 = cursor.fetchone()
    vacation_used = int(row2['used'] or 0)
    
    cursor.close()
    conn.close()
    
    return jsonify({
        'sick_leave': max(0, 15 - sick_used),
        'vacation_leave': max(0, 15 - vacation_used)
    })

# ─── Notifications ───────────────────────────────────────────
def _notify_employee(conn, employee_id, message):
    """Helper: insert a notification for an employee."""
    try:
        cur = conn.cursor()
        cur.execute(
            'INSERT INTO notifications (employee_id, message) VALUES (%s, %s)',
            (employee_id, message)
        )
        conn.commit()
        cur.close()
    except Exception as e:
        print(f"Notification insert failed: {e}")

@records_bp.route('/api/notifications', methods=['GET'])
@require_auth
def get_notifications():
    emp_id = session['user'].get('employee_id')
    if not emp_id:
        return jsonify([])
    conn = get_db()
    if not conn: return jsonify({'error': 'DB error'}), 500
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        'SELECT * FROM notifications WHERE employee_id = %s ORDER BY created_at DESC LIMIT 20',
        (emp_id,)
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify([serialize_dates(r) for r in rows])

@records_bp.route('/api/notifications/<int:notif_id>/read', methods=['PUT'])
@require_auth
def mark_notification_read(notif_id):
    conn = get_db()
    if not conn: return jsonify({'error': 'DB error'}), 500
    cursor = conn.cursor()
    cursor.execute('UPDATE notifications SET is_read = 1 WHERE id = %s', (notif_id,))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Marked as read'})

@records_bp.route('/api/notifications/read-all', methods=['PUT'])
@require_auth
def mark_all_notifications_read():
    emp_id = session['user'].get('employee_id')
    if not emp_id: return jsonify({'error': 'Not linked to employee'}), 400
    conn = get_db()
    if not conn: return jsonify({'error': 'DB error'}), 500
    cursor = conn.cursor()
    cursor.execute('UPDATE notifications SET is_read = 1 WHERE employee_id = %s', (emp_id,))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'All notifications marked as read'})

# ─── Activities ──────────────────────────────────────────────
@records_bp.route('/api/activities', methods=['GET'])
@require_auth
def get_activities():
    conn = get_db()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
        
    cursor = conn.cursor(dictionary=True)
    cursor.execute('SELECT * FROM activities ORDER BY created_at DESC LIMIT 50')
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify([serialize_dates(r) for r in rows])

@records_bp.route('/api/activities', methods=['POST'])
@require_auth
def add_activity():
    data = request.get_json()
    activity = data.get('activity')
    employee = session['user'].get('username')
    
    if not activity: return jsonify({'error': 'Activity text required'}), 400
    
    conn = get_db()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
        
    cursor = conn.cursor()
    cursor.execute('INSERT INTO activities (activity, employee) VALUES (%s, %s)', (activity, employee))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Activity logged'}), 201

@records_bp.route('/api/activities', methods=['DELETE'])
@require_role('admin')
def clear_activities():
    conn = get_db()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
        
    cursor = conn.cursor()
    cursor.execute('DELETE FROM activities')
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'All activity logs successfully purged'})
