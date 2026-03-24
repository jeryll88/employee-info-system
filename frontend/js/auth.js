/**
 * auth.js — Central authentication & RBAC utility
 * Refactored to use the global API utility.
 */

// ─── Session Helpers ──────────────────────────────────────────
function getCurrentUser() {
    const u = sessionStorage.getItem('eis_user');
    return u ? JSON.parse(u) : null;
}

function setCurrentUser(user) {
    sessionStorage.setItem('eis_user', JSON.stringify(user));
}

function clearCurrentUser() {
    sessionStorage.removeItem('eis_user');
}

// ─── Auth Guards ──────────────────────────────────────────────
function requireAuth() {
    if (!getCurrentUser()) {
        window.location.replace('login.html');
        return false;
    }
    return true;
}

function requireRole(...roles) {
    const user = getCurrentUser();
    if (!user) {
        window.location.replace('login.html');
        return false;
    }
    if (!roles.includes(user.role)) {
        window.location.replace('dashboard.html');
        return false;
    }
    return true;
}

// ─── Login / Logout ───────────────────────────────────────────
async function authLogin(username, password) {
    // Uses the global API object from api.js
    const data = await API.post('/api/auth/login', { username, password });
    setCurrentUser(data);
    return data;
}

async function authLogout() {
    try {
        await API.post('/api/auth/logout', {});
    } catch (e) { /* ignore */ }
    clearCurrentUser();
    window.location.replace('login.html');
}

// ─── Navigation Builder ───────────────────────────────────────
function buildNav(role, activePage) {
    const navItems = [
        { label: 'DASHBOARD',       href: 'dashboard.html',    roles: ['admin','hr','employee'] },
        { label: 'EMPLOYEES',       href: 'employee_list.html',roles: ['admin','hr','employee'] },
        { label: 'LEAVE REQUEST',   href: 'leave_request.html',roles: ['employee'] },
        { label: 'LEAVE MANAGEMENT',href: 'leave_manage.html', roles: ['admin','hr'] },
        { label: 'ATTENDANCE',      href: 'attendance.html',   roles: ['admin','hr','employee'] },
        { label: 'PAYROLL',         href: 'payroll.html',      roles: ['admin','hr'] },
    ];

    return navItems
        .filter(item => item.roles.includes(role))
        .map(item => {
            const isActive = item.href === activePage ? 'nav-active' : '';
            return `
                <div class="col-md-2">
                    <a href="${item.href}" class="nav-box ${isActive} text-white text-decoration-none d-block text-center">
                        ${item.label}
                    </a>
                </div>`;
        }).join('');
}

// ─── Role Badge ───────────────────────────────────────────────
function getRoleBadgeHtml(role) {
    const colors = { admin: '#ef4444', hr: '#f59e0b', employee: '#22c55e' };
    const labels = { admin: 'ADMIN', hr: 'HR', employee: 'EMPLOYEE' };
    const color  = colors[role] || '#888';
    const label  = labels[role] || role.toUpperCase();
    return `<span style="
        background: ${color}22;
        border: 1px solid ${color};
        color: ${color};
        padding: 4px 14px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 1.5px;
    ">${label}</span>`;
}
