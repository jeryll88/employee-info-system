from flask import Blueprint, request, jsonify, session
from datetime import date
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from auth import require_role, require_auth

leave_bp = Blueprint('leave', __name__)

def get_db():
    from app import get_db as _get_db
    return _get_db()

def calc_days(start_str, end_str):
    from datetime import datetime
    try:
        s = datetime.strptime(start_str, '%Y-%m-%d').date()
        e = datetime.strptime(end_str,   '%Y-%m-%d').date()
        return max((e - s).days + 1, 1)
    except:
        return 1

# ─── Get Leaves ───────────────────────────────────────────────
@leave_bp.route('/api/leave', methods=['GET'])
@require_auth
def get_leaves():
    conn = get_db()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
        
    cursor = conn.cursor(dictionary=True)
    role = session['user']['role']
    emp_id = session['user'].get('employee_id')

    if role in ('admin', 'hr'):
        cursor.execute('''
            SELECT l.*, e.first_name, e.last_name
            FROM leaves l
            JOIN employees e ON l.employee_id = e.id
            ORDER BY l.created_at DESC
        ''')
    else:
        cursor.execute('''
            SELECT l.*, e.first_name, e.last_name
            FROM leaves l
            JOIN employees e ON l.employee_id = e.id
            WHERE l.employee_id = %s
            ORDER BY l.created_at DESC
        ''', (emp_id,))
    
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(rows)

# ─── Submit Leave Request (Employee) ─────────────────────────
@leave_bp.route('/api/leave', methods=['POST'])
@require_role('employee')
def submit_leave():
    data       = request.get_json()
    emp_id     = session['user']['employee_id']
    leave_type = data.get('leave_type', '').strip()
    start_date = data.get('start_date', '').strip()
    end_date   = data.get('end_date',   '').strip()
    reason     = data.get('reason',     '').strip()

    if not leave_type or not start_date or not end_date:
        return jsonify({'error': 'leave_type, start_date, end_date are required'}), 400

    if leave_type not in ('Sick Leave', 'Vacation Leave'):
        return jsonify({'error': 'Invalid leave type'}), 400

    num_days = calc_days(start_date, end_date)

    conn = get_db()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
        
    cursor = conn.cursor(dictionary=True)
    cursor.execute('SELECT * FROM leave_balances WHERE employee_id = %s', (emp_id,))
    balance = cursor.fetchone()

    if balance:
        field = 'sick_leave' if leave_type == 'Sick Leave' else 'vacation_leave'
        if balance[field] < num_days:
            cursor.close()
            conn.close()
            return jsonify({'error': f'Insufficient {leave_type} balance ({balance[field]} days left)'}), 400

    cursor.execute('''
        INSERT INTO leaves (employee_id, leave_type, start_date, end_date, num_days, reason)
        VALUES (%s, %s, %s, %s, %s, %s)
    ''', (emp_id, leave_type, start_date, end_date, num_days, reason))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Leave request submitted'}), 201

# ─── Approve Leave (Admin/HR) ─────────────────────────────────
@leave_bp.route('/api/leave/<int:leave_id>/approve', methods=['PUT'])
@require_role('admin', 'hr')
def approve_leave(leave_id):
    data    = request.get_json() or {}
    remarks = data.get('remarks', '')
    reviewer= session['user']['username']
    conn    = get_db()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
        
    cursor = conn.cursor(dictionary=True)
    cursor.execute('SELECT * FROM leaves WHERE id = %s', (leave_id,))
    leave = cursor.fetchone()
    
    if not leave:
        cursor.close()
        conn.close()
        return jsonify({'error': 'Leave not found'}), 404

    if leave['status'] != 'Pending':
        cursor.close()
        conn.close()
        return jsonify({'error': 'Leave already processed'}), 400

    # Deduct balance
    field = 'sick_leave' if leave['leave_type'] == 'Sick Leave' else 'vacation_leave'
    cursor.execute(f'''
        UPDATE leave_balances SET {field} = GREATEST({field} - %s, 0), updated_at = CURRENT_TIMESTAMP
        WHERE employee_id = %s
    ''', (leave['num_days'], leave['employee_id']))

    cursor.execute('''
        UPDATE leaves SET status='Approved', reviewed_by=%s, reviewed_at=CURRENT_TIMESTAMP, remarks=%s
        WHERE id=%s
    ''', (reviewer, remarks, leave_id))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Leave approved'})

# ─── Reject Leave (Admin/HR) ──────────────────────────────────
@leave_bp.route('/api/leave/<int:leave_id>/reject', methods=['PUT'])
@require_role('admin', 'hr')
def reject_leave(leave_id):
    data    = request.get_json() or {}
    remarks = data.get('remarks', '')
    reviewer= session['user']['username']
    conn    = get_db()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
        
    cursor = conn.cursor(dictionary=True)
    cursor.execute('SELECT * FROM leaves WHERE id = %s', (leave_id,))
    leave = cursor.fetchone()

    if not leave:
        cursor.close()
        conn.close()
        return jsonify({'error': 'Leave not found'}), 404

    if leave['status'] != 'Pending':
        cursor.close()
        conn.close()
        return jsonify({'error': 'Leave already processed'}), 400

    cursor.execute('''
        UPDATE leaves SET status='Rejected', reviewed_by=%s, reviewed_at=CURRENT_TIMESTAMP, remarks=%s
        WHERE id=%s
    ''', (reviewer, remarks, leave_id))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Leave rejected'})

# ─── Get Leave Balance ────────────────────────────────────────
@leave_bp.route('/api/leave/balance', methods=['GET'])
@require_auth
def get_balance():
    role   = session['user']['role']
    emp_id = request.args.get('employee_id') or session['user'].get('employee_id')

    if role == 'employee' and emp_id != session['user'].get('employee_id'):
        return jsonify({'error': 'Forbidden'}), 403

    conn = get_db()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
        
    cursor = conn.cursor(dictionary=True)
    cursor.execute('SELECT * FROM leave_balances WHERE employee_id = %s', (emp_id,))
    balance = cursor.fetchone()
    cursor.close()
    conn.close()

    if not balance:
        return jsonify({'sick_leave': 15, 'vacation_leave': 15})

    return jsonify(balance)
