from flask import Blueprint, request, jsonify, session
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from auth import require_role, require_auth

employees_bp = Blueprint('employees', __name__)

def get_db():
    from app import get_db as _get_db
    return _get_db()

# ─── Get All Employees (Admin/HR: all | Employee: own) ─────────
@employees_bp.route('/api/employees', methods=['GET'])
@require_auth
def get_employees():
    conn = get_db()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
        
    cursor = conn.cursor(dictionary=True)
    role = session['user']['role']
    emp_id = session['user'].get('employee_id')

    q = request.args.get('q', '').strip()
    dept = request.args.get('department', '').strip()
    pos = request.args.get('position', '').strip()
    status = request.args.get('status', '').strip()

    if role in ('admin', 'hr'):
        query = 'SELECT * FROM employees WHERE 1=1'
        params = []
        if q:
            query += ' AND (last_name LIKE %s OR first_name LIKE %s OR id LIKE %s)'
            params.extend([f'%{q}%', f'%{q}%', f'%{q}%'])
        if dept:
            query += ' AND department = %s'
            params.append(dept)
        if pos:
            query += ' AND position = %s'
            params.append(pos)
        if status:
            query += ' AND status = %s'
            params.append(status)
            
        query += ' ORDER BY last_name'
        cursor.execute(query, tuple(params))
        rows = cursor.fetchall()
    else:
        cursor.execute('SELECT * FROM employees WHERE id = %s', (emp_id,))
        rows = cursor.fetchall()

    cursor.close()
    conn.close()
    return jsonify(rows)

# ─── Get Next Employee ID (Auto-generation) ────────────────────
@employees_bp.route('/api/employees/next-id', methods=['GET'])
@require_auth
def get_next_employee_id():
    conn = get_db()
    if not conn:
        return jsonify({'error': 'Database connect failed'}), 500
    
    cursor = conn.cursor(dictionary=True)
    cursor.execute('SELECT id FROM employees')
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    
    import re
    max_num = 0
    prefix = "EMP"
    
    for r in rows:
        match = re.search(r'\d+', r['id'])
        if match:
            num = int(match.group())
            if num > max_num:
                max_num = num
                
    next_num = max_num + 1 if max_num > 0 else 1
    next_id = f"{prefix}{next_num:03d}"
    
    return jsonify({'next_id': next_id})


# ─── Get Single Employee ───────────────────────────────────────
@employees_bp.route('/api/employees/<emp_id>', methods=['GET'])
@require_auth
def get_employee(emp_id):
    role    = session['user']['role']
    my_emp  = session['user'].get('employee_id')

    if role == 'employee' and my_emp != emp_id:
        return jsonify({'error': 'Forbidden: can only view your own profile'}), 403

    conn = get_db()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cursor = conn.cursor(dictionary=True)
    cursor.execute('SELECT * FROM employees WHERE id = %s', (emp_id,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()

    if not row:
        return jsonify({'error': 'Employee not found'}), 404

    return jsonify(row)

# ─── Add Employee (Admin only) ─────────────────────────────────
@employees_bp.route('/api/employees', methods=['POST'])
@require_role('admin', 'hr')
def add_employee():
    data = request.get_json()
    required = ['id', 'last_name', 'first_name']
    for field in required:
        if not data.get(field):
            return jsonify({'error': f'Missing field: {field}'}), 400

    conn = get_db()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
        
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO employees (id, last_name, first_name, middle_name, birthday, status, position, department, date_hired)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        ''', (
            data['id'], data['last_name'], data['first_name'],
            data.get('middle_name',''), data.get('birthday',''),
            data.get('status','Active'), data.get('position',''),
            data.get('department',''), data.get('date_hired','')
        ))
        conn.commit()
    except Exception as e:
        cursor.close()
        conn.close()
        return jsonify({'error': str(e)}), 400
    cursor.close()
    conn.close()
    return jsonify({'message': 'Employee added successfully'}), 201

# ─── Update Employee (Admin, HR, or Self) ───────────────────────────────
@employees_bp.route('/api/employees/<emp_id>', methods=['PUT'])
@require_auth
def update_employee(emp_id):
    role = session['user']['role']
    my_emp = session['user'].get('employee_id')
    
    if role not in ('admin', 'hr'):
        if role != 'employee' or my_emp != emp_id:
            return jsonify({'error': 'Forbidden: Cannot edit other profiles'}), 403

    data = request.get_json()
    conn = get_db()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
        
    cursor = conn.cursor()
    
    if role == 'employee':
        # Staff can only update personal details, not status/position/department/hired date
        cursor.execute('''
            UPDATE employees SET
                last_name   = COALESCE(%s, last_name),
                first_name  = COALESCE(%s, first_name),
                middle_name = COALESCE(%s, middle_name),
                birthday    = COALESCE(%s, birthday),
                updated_at  = CURRENT_TIMESTAMP
            WHERE id = %s
        ''', (
            data.get('last_name'), data.get('first_name'),
            data.get('middle_name'), data.get('birthday'),
            emp_id
        ))
    else:
        # Admin / HR full update
        cursor.execute('''
            UPDATE employees SET
                last_name   = COALESCE(%s, last_name),
                first_name  = COALESCE(%s, first_name),
                middle_name = COALESCE(%s, middle_name),
                birthday    = COALESCE(%s, birthday),
                status      = COALESCE(%s, status),
                position    = COALESCE(%s, position),
                department  = COALESCE(%s, department),
                date_hired  = COALESCE(%s, date_hired),
                updated_at  = CURRENT_TIMESTAMP
            WHERE id = %s
        ''', (
            data.get('last_name'), data.get('first_name'),
            data.get('middle_name'), data.get('birthday'),
            data.get('status'), data.get('position'),
            data.get('department'), data.get('date_hired'),
            emp_id
        ))
        
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Employee updated'})

# ─── Delete Employee (Admin only) ─────────────────────────────
@employees_bp.route('/api/employees/<emp_id>', methods=['DELETE'])
@require_role('admin')
def delete_employee(emp_id):
    conn = get_db()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
        
    cursor = conn.cursor()
    cursor.execute('DELETE FROM employees WHERE id = %s', (emp_id,))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Employee deleted'})
