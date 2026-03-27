from flask import Blueprint, jsonify
from auth import require_auth

dashboard_bp = Blueprint('dashboard', __name__)

def get_db():
    from app import get_db as _get_db
    return _get_db()

@dashboard_bp.route('/api/dashboard/summary', methods=['GET'])
@require_auth
def get_summary():
    conn = get_db()
    if not conn: return jsonify({'error': 'DB Error'}), 500
    cursor = conn.cursor(dictionary=True)
    
    # Total Employees
    cursor.execute('SELECT COUNT(*) as total FROM employees')
    total_employees = cursor.fetchone()['total']
    
    # Headcount by Department
    cursor.execute('SELECT department, COUNT(*) as count FROM employees GROUP BY department')
    dept_distribution = cursor.fetchall()
    
    # Recent Evaluations
    cursor.execute('''
        SELECT p.id, p.rating, p.evaluation_date, p.reviewer, e.first_name, e.last_name 
        FROM performance_evaluations p 
        JOIN employees e ON p.employee_id = e.id 
        ORDER BY p.evaluation_date DESC LIMIT 5
    ''')
    recent_evals = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    return jsonify({
        'total_employees': total_employees,
        'department_distribution': dept_distribution,
        'recent_evaluations': recent_evals
    })
