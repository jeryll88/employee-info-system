if (!requireRole('employee')) { /* redirects handled inside */ }

document.addEventListener('DOMContentLoaded', () => {
    loadHistory();
    loadLeaveNotifications();
});

async function loadLeaveNotifications() {
    const container = document.getElementById('notifAlerts');
    if (!container) return;
    try {
        const notifs = await API.get('/api/notifications');
        const unread = notifs.filter(n => !n.is_read);
        if (!unread.length) return;
        container.innerHTML = unread.map(n => `
            <div class="alert alert-info d-flex justify-content-between align-items-start mb-2" style="background:rgba(99,102,241,0.15); border:1px solid rgba(99,102,241,0.4); border-radius:10px; color:#c7d2fe;">
                <span><i class="bi bi-bell-fill me-2"></i>${n.message}</span>
                <button class="btn btn-sm border-0 text-white" onclick="dismissNotif(${n.id}, this.parentElement)" style="background:transparent; font-size:16px; line-height:1; padding:0 4px; margin-left:12px;">&times;</button>
            </div>
        `).join('');
    } catch (e) {}
}

async function dismissNotif(id, el) {
    try { await API.put(`/api/notifications/${id}/read`, {}); } catch(e){}
    el.remove();
}

async function loadHistory() {
    const tbody = document.getElementById('historyTableBody');
    try {
        const leaves = await API.get('/api/leave');
        if (leaves.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-dim py-4">No active or historic requests.</td></tr>';
            return;
        }

        tbody.innerHTML = leaves.map(l => {
            const badgeClass = l.status === 'Approved' ? 'success' : l.status === 'Rejected' ? 'danger' : 'warning text-dark';
            return `
            <tr>
                <td class="fw-bold text-white">${l.leave_type}</td>
                <td class="small">${l.date_from} — ${l.date_to}</td>
                <td class="text-dim text-truncate" style="max-width:200px;" title="${l.reason}">${l.reason}</td>
                <td><span class="badge bg-${badgeClass} p-2">${l.status}</span></td>
            </tr>
            `;
        }).join('');

    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-danger py-4">Failed to load history.</td></tr>';
    }
}

async function submitLeave(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSubmit');
    const msg = document.getElementById('subMsg');
    
    btn.disabled = true;
    msg.innerText = '';
    
    const payload = {
        leave_type: document.getElementById('leaveType').value,
        date_from: document.getElementById('dateFrom').value,
        date_to: document.getElementById('dateTo').value,
        reason: document.getElementById('leaveReason').value.trim()
    };

    try {
        await API.post('/api/leave', payload);
        API.showToast("Your leave request has been submitted to HR.", "success");
        document.getElementById('leaveForm').reset();
        loadHistory();
    } catch (err) {
        msg.innerText = err.message || "Failed to submit request.";
    } finally {
        btn.disabled = false;
    }
}
