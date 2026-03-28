/**
 * dashboard.js
 * Handles data fetching and rendering for the EIS Dashboard.
 */

if (!requireAuth()) {
    // Redirects handled by requireAuth
}

document.addEventListener('DOMContentLoaded', async () => {
    const user = getCurrentUser();
    if (!user) return;

    initDashboardUI(user);
    await refreshDashboardData(user);
});

function initDashboardUI(user) {
    // Render navigation
    const navBar = document.getElementById('navBar');
    if (navBar) navBar.innerHTML = buildNav(user.role, 'dashboard.html');

    // Header Info
    const userInfo = document.getElementById('userInfo');
    if (userInfo) {
        userInfo.innerHTML = `
            <span class="text-dim">Logged in as </span>
            <strong class="text-white">${user.username}</strong>
            &nbsp;${getRoleBadgeHtml(user.role)}
        `;
    }

    // Role-based sections
    const adminOnlySections = ['statusBoxesSection'];
    adminOnlySections.forEach(id => {
        const el = document.getElementById(id);
        if (el && user.role === 'employee') {
            el.style.setProperty('display', 'none', 'important');
        }
    });

    // Recent Activities: show for admin AND hr
    const activityLog = document.getElementById('recentActivitiesSection');
    if (activityLog) {
        if (user.role === 'admin' || user.role === 'hr') {
            activityLog.style.removeProperty('display');
            activityLog.style.display = 'block';
        } else {
            activityLog.style.setProperty('display', 'none', 'important');
        }
    }

    // Reporting section (admin / hr)
    const reportingSection = document.getElementById('reportingSection');
    if (reportingSection && (user.role === 'admin' || user.role === 'hr')) {
        reportingSection.style.display = 'flex';
    }

    // Employee welcome + leave balance
    const empWelcome = document.getElementById('employeeWelcomeSection');
    const empBtn     = document.getElementById('empProfileBtn');
    const leaveSection = document.getElementById('leaveBalanceSection');
    if (user.role === 'employee') {
        if (empWelcome) empWelcome.style.display = 'block';
        if (empBtn)     empBtn.href = `employee_info.html?id=${user.employee_id}`;
        if (leaveSection) leaveSection.style.display = 'flex';
    }

    // Notification bell: employee only
    const bellWrap = document.getElementById('notifBellWrap');
    if (bellWrap && user.role === 'employee') {
        bellWrap.style.display = 'block';
    }
}

async function refreshDashboardData(user) {
    try {
        if (user.role === 'admin' || user.role === 'hr') {
            await Promise.all([
                loadEmployeeStats(),
                loadActivities(),
                loadReportingData()
            ]);
        } else if (user.role === 'employee') {
            await Promise.all([
                loadLeaveBalance(),
                loadNotifications()
            ]);
        }
    } catch (err) {
        console.error('Dashboard refresh failed:', err);
    }
}

async function loadEmployeeStats() {
    try {
        const emps = await API.get('/api/employees');
        const counts = { Active: 0, Permanent: 0, Temporary: 0, Separated: 0 };
        emps.forEach(e => {
            if (counts.hasOwnProperty(e.status)) counts[e.status]++;
        });
        document.getElementById('activeCount').textContent    = counts.Active;
        document.getElementById('permanentCount').textContent = counts.Permanent;
        document.getElementById('temporaryCount').textContent = counts.Temporary;
        document.getElementById('separatedCount').textContent = counts.Separated;
    } catch (e) {}
}

async function loadLeaveBalance() {
    try {
        const data = await API.get('/api/leave/balance');
        document.getElementById('sickBalance').textContent     = data.sick_leave    ?? '0';
        document.getElementById('vacationBalance').textContent = data.vacation_leave ?? '0';
    } catch (e) {}
}

async function loadActivities() {
    const table = document.getElementById('recentActivities');
    if (!table) return;

    try {
        const activities = await API.get('/api/activities');
        table.innerHTML = '';

        if (!activities.length) {
            table.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-dim">No recent activities recorded.</td></tr>';
            return;
        }

        activities.forEach((act, index) => {
            const dateStr = new Date(act.created_at).toLocaleString([], {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
            table.innerHTML += `
                <tr>
                    <td class="text-dim small">#${index + 1}</td>
                    <td class="fw-medium">${act.activity}</td>
                    <td><span class="badge bg-dark-subtle text-dim border border-secondary">${act.employee || '—'}</span></td>
                    <td class="text-dim small">${dateStr}</td>
                </tr>
            `;
        });
    } catch (e) {
        table.innerHTML = '<tr><td colspan="4" class="text-center text-danger py-4">Error loading activities.</td></tr>';
    }
}

async function clearActivities() {
    if (!confirm('Are you sure you want to permanently delete all system activity logs? This action cannot be undone.')) return;
    try {
        await API.delete('/api/activities');
        API.showToast('Activity history has been permanently cleared.', 'success');
        loadActivities();
    } catch (e) {}
}

// ─── Reporting: Headcount by Department ─────────────────────
async function loadReportingData() {
    try {
        const data  = await API.get('/api/dashboard/summary');
        const depts = data.department_distribution || [];
        const total = depts.reduce((s, d) => s + d.count, 0);

        const deptGrid = document.getElementById('deptGrid');
        const noteEl   = document.getElementById('deptTotalNote');

        if (!depts.length) {
            deptGrid.innerHTML = '<div class="text-dim">No department data.</div>';
        } else {
            deptGrid.innerHTML = depts.map(d => {
                const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
                const label = d.department || 'Unassigned';
                return `
                <div class="dept-card">
                    <div class="dept-name">${label}</div>
                    <div class="dept-count">${d.count}</div>
                    <div class="dept-bar-wrap"><div class="dept-bar" style="width:${pct}%"></div></div>
                    <div class="dept-pct">${pct}% of workforce</div>
                </div>`;
            }).join('');
            if (noteEl) noteEl.textContent = `Total headcount: ${total} employees across ${depts.length} department(s)`;
        }

        // Recent evaluations
        const evals   = data.recent_evaluations || [];
        const evalHtml = !evals.length
            ? `<tr><td class="text-center py-4 text-dim">No recent evaluations</td></tr>`
            : evals.map(e => `
                <tr>
                    <td class="fw-semibold">${e.first_name} ${e.last_name}</td>
                    <td><span class="text-warning"><i class="bi bi-star-fill me-1"></i>${e.rating}</span></td>
                    <td class="text-dim small">${e.evaluation_date}</td>
                </tr>`).join('');
        document.getElementById('evalTableBody').innerHTML = evalHtml;

    } catch (e) { console.error('Reporting load failed:', e); }
}

// ─── Notifications ───────────────────────────────────────────
let notifOpen = false;

function toggleNotifDropdown() {
    const dropdown = document.getElementById('notifDropdown');
    notifOpen = !notifOpen;
    dropdown.classList.toggle('open', notifOpen);
    if (notifOpen) loadNotifications();
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const wrap = document.getElementById('notifBellWrap');
    if (wrap && !wrap.contains(e.target) && notifOpen) {
        notifOpen = false;
        document.getElementById('notifDropdown').classList.remove('open');
    }
});

async function loadNotifications() {
    const listEl  = document.getElementById('notifList');
    const badgeEl = document.getElementById('notifBadge');
    if (!listEl) return;

    try {
        const notifs = await API.get('/api/notifications');
        const unread = notifs.filter(n => !n.is_read);

        // Update badge
        if (unread.length > 0) {
            badgeEl.style.display = 'flex';
            badgeEl.textContent   = unread.length > 9 ? '9+' : unread.length;
        } else {
            badgeEl.style.display = 'none';
        }

        if (!notifs.length) {
            listEl.innerHTML = '<div class="notif-empty"><i class="bi bi-bell-slash fs-4 d-block mb-2"></i>No notifications</div>';
            return;
        }

        listEl.innerHTML = notifs.map(n => {
            const timeStr = new Date(n.created_at).toLocaleString([], {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
            return `
            <div class="notif-item ${!n.is_read ? 'unread' : ''}">
                <div class="notif-msg">${n.message}</div>
                <div class="notif-time">${timeStr}</div>
            </div>`;
        }).join('');
    } catch (e) {
        if (listEl) listEl.innerHTML = '<div class="notif-empty text-danger">Failed to load notifications.</div>';
    }
}

async function markAllRead(e) {
    e.stopPropagation();
    try {
        await API.put('/api/notifications/read-all', {});
        loadNotifications();
    } catch (err) {}
}