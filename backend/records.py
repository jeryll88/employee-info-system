from flask import Blueprint, request, jsonify, session
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from auth import require_role, require_auth

records_bp = Blueprint('records', __name__)

def get_db():
    from app import get_db as _get_db
    return _get_db()

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
    return jsonify(rows)

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
    return jsonify(row)

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
    return jsonify(rows)

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
    return jsonify(row)

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
    emp_id = request.args.get('employee_id') or session['user'].get('employee_id')
    conn = get_db()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
        
    cursor = conn.cursor(dictionary=True)
    cursor.execute('SELECT * FROM attendance WHERE employee_id = %s ORDER BY attendance_date DESC', (emp_id,))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(rows)

@records_bp.route('/api/attendance', methods=['POST'])
@require_auth
def log_attendance():
    data    = request.get_json()
    role    = session['user']['role']
    # If admin/hr, they can specify emp_id. If employee, it's their own.
    emp_id  = data.get('employee_id') if role in ('admin', 'hr') else session['user'].get('employee_id')
    
    if not emp_id: return jsonify({'error': 'Employee ID required'}), 400
    
    a_date = data.get('attendance_date')
    t_in   = data.get('time_in')
    t_out  = data.get('time_out')

    conn = get_db()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
        
    cursor = conn.cursor(dictionary=True)
    # Check if already logged for today
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

# ─── Payroll ───────────────────────────────────────────────
@records_bp.route('/api/payroll/generate', methods=['POST'])
@require_role('admin', 'hr')
def generate_payroll():
    data = request.get_json()
    emp_id = data.get('employee_id')
    if not emp_id: return jsonify({'error': 'Employee ID required'}), 400
    
    # Dummy calculation
    # In a real system, you'd fetch position/salary and attendance days
    net_salary = 25000.00 # Placeholder
    
    return jsonify({
        'employee_id': emp_id,
        'net_salary': f"{net_salary:,.2f}",
        'currency': 'PHP'
    })

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
    return jsonify(rows)

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
