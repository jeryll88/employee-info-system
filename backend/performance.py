from flask import Blueprint, request, jsonify, session
from auth import require_role, require_auth

performance_bp = Blueprint('performance', __name__)

def get_db():
    from app import get_db as _get_db
    return _get_db()

@performance_bp.route('/api/performance', methods=['GET'])
@require_auth
def get_evaluations():
    emp_id = request.args.get('employee_id')
    if not emp_id:
        return jsonify({'error': 'employee_id required'}), 400
        
    conn = get_db()
    if not conn: return jsonify({'error': 'DB Error'}), 500
    cursor = conn.cursor(dictionary=True)
    cursor.execute('SELECT * FROM performance_evaluations WHERE employee_id = %s ORDER BY evaluation_date DESC', (emp_id,))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(rows)

@performance_bp.route('/api/performance', methods=['POST'])
@require_role('admin', 'hr')
def add_evaluation():
    data = request.json
    emp_id = data.get('employee_id')
    eval_date = data.get('evaluation_date')
    reviewer = data.get('reviewer')
    rating = data.get('rating')
    comments = data.get('comments', '')
    
    if not all([emp_id, eval_date, reviewer, rating]):
        return jsonify({'error': 'Missing fields'}), 400
        
    conn = get_db()
    if not conn: return jsonify({'error': 'DB Error'}), 500
    cursor = conn.cursor()
    cursor.execute('INSERT INTO performance_evaluations (employee_id, evaluation_date, reviewer, rating, comments) VALUES (%s, %s, %s, %s, %s)', 
                   (emp_id, eval_date, reviewer, rating, comments))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Evaluation added'}), 201

@performance_bp.route('/api/performance/<int:id>', methods=['DELETE'])
@require_role('admin')
def delete_evaluation(id):
    conn = get_db()
    if not conn: return jsonify({'error': 'DB Error'}), 500
    cursor = conn.cursor()
    cursor.execute('DELETE FROM performance_evaluations WHERE id = %s', (id,))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'Evaluation deleted'}), 200
