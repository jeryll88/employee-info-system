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
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if 'user' not in session:
                return jsonify({'error': 'Not authenticated'}), 401
            if session['user']['role'] not in roles:
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
