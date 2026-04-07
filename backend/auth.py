from flask import Blueprint, request, jsonify, session
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash
import sys, os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

auth_bp = Blueprint('auth', __name__)

def get_db():
    from app import get_db as _get_db
    return _get_db()

# ─── Role decorator ───────────────────────────────────────────
def require_role(*roles):
    # Normalize roles to lowercase for robust comparison
    allowed_roles = [r.lower() for r in roles]
    
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if 'user' not in session:
                return jsonify({'error': 'Not authenticated'}), 401
            
            # Extract and normalize session role
            user_role = str(session['user'].get('role', '')).strip().lower()
            
            # ─── Superuser Rule ──────────────────────────────────
            # 'admin' has inherent access to all administrative tasks (hr or admin)
            if user_role == 'admin':
                return f(*args, **kwargs)
            
            if user_role not in allowed_roles:
                return jsonify({'error': 'Forbidden: insufficient permissions'}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user' not in session:
            return jsonify({'error': 'Not authenticated'}), 401
        return f(*args, **kwargs)
    return decorated

# ─── Login ────────────────────────────────────────────────────
@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    username = (data.get('username') or '').strip()
    password = (data.get('password') or '').strip()
    req_role = (data.get('role') or 'admin').strip()

    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400

    conn = get_db()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
        
    cursor = conn.cursor(dictionary=True)
    cursor.execute('SELECT * FROM users WHERE username = %s', (username,))
    user = cursor.fetchone()
    
    if not user:
        cursor.close()
        conn.close()
        return jsonify({'error': 'Invalid username or password'}), 401

    # Check password
    is_correct = False
    if user['password'].startswith('pbkdf2:sha256:') or user['password'].startswith('scrypt:'):
        is_correct = check_password_hash(user['password'], password)
    else:
        # Transition from plain text
        if user['password'] == password:
            is_correct = True
            # Upgrade to hash
            new_hash = generate_password_hash(password)
            cursor.execute('UPDATE users SET password = %s WHERE id = %s', (new_hash, user['id']))
            conn.commit()

    cursor.close()
    conn.close()

    if not is_correct:
        return jsonify({'error': 'Invalid username or password'}), 401

    # Role check: Ensure user logs into the correct portal
    # If user is 'admin', they MUST select 'admin' tab.
    # If user is 'hr', they MUST select 'hr' tab.
    # If user is 'employee', they MUST select 'employee' (Staff) tab.
    if user['role'] != req_role:
        return jsonify({'error': f'Unauthorized: This account is registered as {user["role"].upper()}, but you are trying to log in as {req_role.upper()}.'}), 403

    session['user'] = {
        'id':          user['id'],
        'username':    user['username'],
        'role':        user['role'],
        'employee_id': user['employee_id']
    }

    return jsonify({
        'message':     'Login successful',
        'username':    user['username'],
        'role':        user['role'],
        'employee_id': user['employee_id']
    })

# ─── Logout ───────────────────────────────────────────────────
@auth_bp.route('/api/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Logged out'})

# ─── Whoami ───────────────────────────────────────────────────
@auth_bp.route('/api/auth/me', methods=['GET'])
@require_auth
def me():
    return jsonify(session['user'])

# ─── User Management (Admin Only) ──────────────────────────────
@auth_bp.route('/api/users', methods=['GET'])
@require_role('admin')
def get_users():
    conn = get_db()
    if not conn: return jsonify({'error': 'DB error'}), 500
    cursor = conn.cursor(dictionary=True)
    cursor.execute('SELECT id, username, role, employee_id, created_at FROM users ORDER BY username')
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(rows)

@auth_bp.route('/api/users', methods=['POST'])
@require_role('admin')
def create_user():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    role = data.get('role', 'employee')
    emp_id = data.get('employee_id') or None
    
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
        
    hashed_pw = generate_password_hash(password)
    
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            'INSERT INTO users (username, password, role, employee_id) VALUES (%s, %s, %s, %s)',
            (username, hashed_pw, role, emp_id)
        )
        conn.commit()
    except Exception as e:
        return jsonify({'error': 'Username already exists or invalid employee ID'}), 400
    finally:
        cursor.close()
        conn.close()
        
    return jsonify({'message': 'User created'})

@auth_bp.route('/api/users/<int:user_id>', methods=['DELETE'])
@require_role('admin')
def delete_user(user_id):
    if session['user']['id'] == user_id:
        return jsonify({'error': 'Cannot delete yourself'}), 403
        
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM users WHERE id = %s', (user_id,))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'message': 'User deleted'})
