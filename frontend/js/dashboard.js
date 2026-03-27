/**
 * dashboard.js
 * Handles data fetching and rendering for the EIS Dashboard.
 */

document.addEventListener('DOMContentLoaded', async () => {
    const user = getCurrentUser();
    if (!user) return;

    // 1. UI Initialization
    initDashboardUI(user);

    // 2. Data Loading
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

    if (user.role !== 'admin') {
        const activityLog = document.getElementById('recentActivitiesSection');
        if (activityLog) activityLog.style.setProperty('display', 'none', 'important');
    }

    const empWelcome = document.getElementById('employeeWelcomeSection');
    const empBtn = document.getElementById('empProfileBtn');
    const leaveSection = document.getElementById('leaveBalanceSection');
    if (user.role === 'employee') {
        if (empWelcome) empWelcome.style.display = 'block';
        if (empBtn) empBtn.href = `employee_info.html?id=${user.employee_id}`;
        if (leaveSection) leaveSection.style.display = 'flex';
    }
}

async function refreshDashboardData(user) {
    try {
        if (user.role === 'admin' || user.role === 'hr') {
            await Promise.all([
                loadEmployeeStats(),
                loadActivities()
            ]);
        } else if (user.role === 'employee') {
            await loadLeaveBalance();
        }
    } catch (err) {
        console.error("Dashboard refresh failed:", err);
    }
}

async function loadEmployeeStats() {
    try {
        const emps = await API.get('/api/employees');
        const counts = { Active: 0, Permanent: 0, Temporary: 0, Separated: 0 };
        
        emps.forEach(e => {
            if (counts.hasOwnProperty(e.status)) counts[e.status]++;
            else if (e.status === 'Active') counts.Active++; // Fallback
        });

        document.getElementById('activeCount').textContent    = counts.Active;
        document.getElementById('permanentCount').textContent = counts.Permanent;
        document.getElementById('temporaryCount').textContent = counts.Temporary;
        document.getElementById('separatedCount').textContent = counts.Separated;
    } catch (e) { /* API utility handles toasts */ }
}

async function loadLeaveBalance() {
    try {
        const data = await API.get('/api/leave/balance');
        document.getElementById('sickBalance').textContent    = data.sick_leave    ?? '0.00';
        document.getElementById('vacationBalance').textContent= data.vacation_leave ?? '0.00';
    } catch (e) {}
}

async function loadActivities() {
    const table = document.getElementById('recentActivities');
    if (!table) return;

    try {
        const activities = await API.get('/api/activities');
        table.innerHTML = '';

        if (activities.length === 0) {
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
                    <td><span class="badge bg-dark-subtle text-dim border border-secondary">${act.employee}</span></td>
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
        API.showToast("Activity history has been permanently cleared.", "success");
        loadActivities();
    } catch (e) {
        // Errors are natively caught and toasted by our HTTP handler
    }
}