if (!requireRole('admin', 'hr')) { /* redirects handled inside */ }

document.addEventListener('DOMContentLoaded', loadLeaves);

async function loadLeaves() {
    const tbody = document.getElementById('leaveTableBody');
    try {
        const leaves = await API.get('/api/leave');
        if (leaves.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-dim py-4">No leave requests found.</td></tr>';
            return;
        }

        tbody.innerHTML = leaves.map(l => {
            const badgeClass = l.status === 'Approved' ? 'success' : l.status === 'Rejected' ? 'danger' : 'warning text-dark';
            return `
            <tr>
                <td class="text-dim">#${l.id}</td>
                <td class="fw-bold">${l.employee_id}</td>
                <td><span class="badge border border-light text-light px-2 py-1">${l.leave_type}</span></td>
                <td class="small">${l.date_from} <i class="bi bi-arrow-right text-dim mx-1"></i> ${l.date_to}</td>
                <td class="small text-truncate" style="max-width: 250px;" title="${l.reason}">${l.reason}</td>
                <td><span class="badge bg-${badgeClass} p-2">${l.status}</span></td>
                <td>
                    ${l.status === 'Pending' ? `
                        <button class="btn btn-sm btn-success py-1 px-2 me-1" onclick="updateLeave(${l.id}, 'Approved')" title="Approve">
                            <i class="bi bi-check-lg"></i>
                        </button>
                        <button class="btn btn-sm btn-danger py-1 px-2" onclick="updateLeave(${l.id}, 'Rejected')" title="Reject">
                            <i class="bi bi-x-lg"></i>
                        </button>
                    ` : '<span class="text-dim small">Reviewed</span>'}
                </td>
            </tr>
            `;
        }).join('');

    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-danger py-4">Failed to load system leaves.</td></tr>';
    }
}

async function updateLeave(id, newStatus) {
    if(!confirm(`Mark request #${id} as ${newStatus}?`)) return;
    try {
        await API.put(`/api/leave/${id}`, { status: newStatus });
        API.showToast(`Request #${id} marked as ${newStatus}.`, "success");
        loadLeaves();
    } catch (err) {
        alert(err.message);
    }
}
