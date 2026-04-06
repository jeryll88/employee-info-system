if (!requireRole('admin', 'hr')) { /* redirects handled inside */ }

document.addEventListener('DOMContentLoaded', loadLeaves);

async function loadLeaves() {
    const pendingSection  = document.getElementById('pendingSection');
    const pendingBody     = document.getElementById('pendingTableBody');
    const approvedSection = document.getElementById('approvedSection');

    try {
        // Fetch leaves and employee list in parallel
        const [leaves, employees] = await Promise.all([
            API.get('/api/leave'),
            API.get('/api/employees')
        ]);

        // Build a map: employee_id -> full name
        const nameMap = {};
        employees.forEach(e => {
            const fullName = [e.first_name, e.middle_name, e.last_name]
                .filter(Boolean).join(' ');
            nameMap[e.id.trim()] = fullName || e.id;
        });

        // ── Pending requests ────────────────────────────────────────
        const pending = leaves.filter(l => l.status === 'Pending');
        if (pending.length === 0) {
            pendingBody.innerHTML = '<tr><td colspan="7" class="text-dim py-3">No pending requests.</td></tr>';
        } else {
            pendingBody.innerHTML = pending.map(l => `
            <tr>
                <td class="text-dim">#${l.id}</td>
                <td>
                    <div class="fw-bold text-white">${nameMap[l.employee_id] || l.employee_id}</div>
                    <div class="text-dim small">${l.employee_id}</div>
                </td>
                <td><span class="badge border border-light text-light px-2 py-1">${l.leave_type}</span></td>
                <td class="small">${l.date_from} <i class="bi bi-arrow-right text-dim mx-1"></i> ${l.date_to}</td>
                <td class="small text-truncate" style="max-width:200px;" title="${l.reason}">${l.reason}</td>
                <td><span class="badge bg-warning text-dark p-2">Pending</span></td>
                <td>
                    <button class="btn btn-sm btn-success py-1 px-2 me-1" onclick="updateLeave(${l.id}, 'Approved')" title="Approve">
                        <i class="bi bi-check-lg"></i>
                    </button>
                    <button class="btn btn-sm btn-danger py-1 px-2" onclick="updateLeave(${l.id}, 'Rejected')" title="Reject">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </td>
            </tr>`).join('');
        }

        // ── Approved leaves grouped by employee name ────────────────
        const approved = leaves.filter(l => l.status === 'Approved');

        if (approved.length === 0) {
            approvedSection.innerHTML = `
                <div class="text-dim text-center py-4">
                    <i class="bi bi-calendar-check fs-3 d-block mb-2"></i>
                    No approved leave requests yet.
                </div>`;
        } else {
            // Group by employee_id, then sort groups by employee name
            const groups = {};
            approved.forEach(l => {
                if (!groups[l.employee_id]) groups[l.employee_id] = [];
                groups[l.employee_id].push(l);
            });

            const sortedIds = Object.keys(groups).sort((a, b) => {
                const na = nameMap[a] || a;
                const nb = nameMap[b] || b;
                return na.localeCompare(nb);
            });

            approvedSection.innerHTML = sortedIds.map(empId => {
                const empName = nameMap[empId] || empId;
                const empLeaves = groups[empId];

                const leaveRows = empLeaves.map(l => `
                    <div class="leave-entry d-flex align-items-start gap-3 py-2 px-3 rounded mb-2"
                         style="background:rgba(255,255,255,0.04); border-left: 3px solid rgba(99,102,241,0.6);">
                        <div class="text-dim small pt-1" style="min-width:30px;">#${l.id}</div>
                        <div class="flex-grow-1">
                            <span class="badge border border-light text-light px-2 py-1 me-2">${l.leave_type}</span>
                            <span class="small text-dim">${l.date_from} <i class="bi bi-arrow-right mx-1"></i> ${l.date_to}</span>
                            <div class="small text-dim mt-1 text-truncate" style="max-width:400px;" title="${l.reason}">${l.reason}</div>
                        </div>
                        <div class="d-flex align-items-center gap-2 align-self-center">
                            <span class="badge bg-success p-2">Approved</span>
                            <button class="btn btn-sm btn-outline-danger border-0 px-2" onclick="deleteLeave(${l.id})" title="Delete Record">
                                <i class="bi bi-trash3-fill"></i>
                            </button>
                        </div>
                    </div>`).join('');

                return `
                <div class="employee-leave-group mb-4">
                    <div class="d-flex align-items-center gap-2 mb-2 pb-1" style="border-bottom: 1px solid rgba(255,255,255,0.1);">
                        <div class="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white"
                             style="width:36px;height:36px;background:linear-gradient(135deg,#6366f1,#8b5cf6);font-size:14px;flex-shrink:0;">
                            ${empName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div class="fw-bold text-white">${empName}</div>
                            <div class="text-dim small">${empId} &bull; ${empLeaves.length} approved leave${empLeaves.length > 1 ? 's' : ''}</div>
                        </div>
                    </div>
                    ${leaveRows}
                </div>`;
            }).join('');
        }

    } catch (e) {
        pendingBody.innerHTML = '<tr><td colspan="7" class="text-danger py-4">Failed to load leave requests.</td></tr>';
        console.error(e);
    }
}

async function updateLeave(id, newStatus) {
    if (!confirm(`Mark request #${id} as ${newStatus}?`)) return;
    try {
        await API.put(`/api/leave/${id}`, { status: newStatus });
        API.showToast(`Request #${id} marked as ${newStatus}.`, 'success');
        loadLeaves();
    } catch (err) {
        alert(err.message);
    }
}
async function deleteLeave(id) {
    if (!confirm(`Are you sure you want to PERMANENTLY delete leave record #${id}?`)) return;
    try {
        await API.delete(`/api/leave/${id}`);
        API.showToast(`Request #${id} deleted.`, 'success');
        loadLeaves();
    } catch (err) {
        alert(err.message);
    }
}
