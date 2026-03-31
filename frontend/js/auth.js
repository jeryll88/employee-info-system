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
async function authLogin(username, password, role = 'admin') {
    // Uses the global API object from api.js
    const data = await API.post('/api/auth/login', { username, password, role });
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
    const user = getCurrentUser();
    const navItems = [
        { label: 'DASHBOARD',       icon: 'bi-speedometer2',   href: 'dashboard.html',    roles: ['admin','hr','employee'] },
        { label: 'DIRECTORY',       icon: 'bi-people-fill',    href: 'employee_list.html',roles: ['admin','hr'] },
        { label: 'ATTENDANCE',      icon: 'bi-calendar-check', href: 'attendance.html',   roles: ['admin','hr','employee'] },
        { label: 'LEAVE REQUEST',   icon: 'bi-file-earmark-plus', href: 'leave_request.html',roles: ['employee'] },
        { label: 'LEAVES',          icon: 'bi-calendar3',      href: 'leave_manage.html', roles: ['admin','hr'] },
        { label: 'PAYROLL',         icon: 'bi-cash-stack',     href: 'payroll.html',      roles: ['admin','hr','employee'] },
        { label: 'USERS',           icon: 'bi-person-gear',    href: 'users.html',        roles: ['admin'] }
    ];
    
    if (user && user.role === 'employee') {
        navItems.splice(1, 0, { label: 'MY PROFILE', icon: 'bi-person-badge', href: `employee_info.html?id=${user.employee_id}`, roles: ['employee'] });
    }

    return navItems
        .filter(item => item.roles.includes(role))
        .map(item => {
            const isActive = item.href === activePage ? 'nav-active' : '';
            
            // For Settings, we only show the icon as requested.
            // For others, we show Icon + Label for better UX/premium feel.
            let content = '';
            if (item.label === 'SETTINGS') {
                content = `<i class="bi ${item.icon}" style="font-size: 1.4rem;" title="Settings"></i>`;
            } else {
                content = `<i class="bi ${item.icon} mb-1 d-block" style="font-size: 1.2rem;"></i> 
                           <span style="font-size: 11px; font-weight: 700; letter-spacing: 0.5px;">${item.label}</span>`;
            }

            return `
                <div class="col-md-2">
                    <a href="${item.href}" class="nav-box ${isActive} text-white text-decoration-none d-flex flex-column align-items-center justify-content-center" style="min-height: 80px;">
                        ${content}
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

/**
 * renderUserHeader
 * Returns HTML for the "Logged in as [User] [Badge] [Settings Icon]"
 */
function renderUserHeader(user) {
    if (!user) return '';
    
    const settingsBtn = (user.role === 'admin') 
        ? `<a href="settings.html" class="text-dim hover-white ms-2" title="System Settings" style="transition: color 0.2s;">
            <i class="bi bi-gear-fill" style="font-size: 1.1rem; vertical-align: middle;"></i>
           </a>`
        : '';

    return `
        <div class="d-flex align-items-center">
            <span class="text-dim me-1">Logged in as </span>
            <strong class="text-white me-2">${user.username}</strong>
            ${getRoleBadgeHtml(user.role)}
            ${settingsBtn}
        </div>
    `;
}
