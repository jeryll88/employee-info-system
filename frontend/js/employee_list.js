const user = getCurrentUser();

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('userNameDisplay').innerText = user ? user.username : '';

    if (user.role === 'admin' || user.role === 'hr') {
        document.getElementById('searchFilters').style.display = 'block';
    }

    if (user.role === 'admin') {
        document.getElementById('adminActions').innerHTML = `
            <a href="employee_add.html" class="btn-primary-custom">
                <i class="bi bi-person-plus-fill"></i> Add Employee
            </a>
        `;
    }

    // Bind Enter key press to search
    document.getElementById('filterQ')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loadDirectory();
    });

    loadDirectory();
});

async function loadDirectory() {
    const tbody = document.getElementById('employeeListBody');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-dim">Loading...</td></tr>';

    let url = '/api/employees';
    if (user.role === 'admin' || user.role === 'hr') {
        const q = document.getElementById('filterQ').value.trim();
        const dept = document.getElementById('filterDept').value.trim();
        const status = document.getElementById('filterStatus').value.trim();
        const params = new URLSearchParams();
        if (q) params.append('q', q);
        if (dept) params.append('department', dept);
        if (status) params.append('status', status);
        
        const qs = params.toString();
        if (qs) url += `?${qs}`;
    }

    try {
        const list = await API.get(url);
        
        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-5 text-dim">No employees found matching criteria.</td></tr>';
            return;
        }

        tbody.innerHTML = list.map(emp => `
            <tr>
                <td class="text-dim fw-medium">#${emp.id}</td>
                <td class="fw-semibold">${emp.first_name} ${emp.last_name}</td>
                <td class="text-dim">${emp.department || '—'}</td>
                <td class="text-dim">${emp.position || '—'}</td>
                <td>
                    <span class="badge-custom ${emp.status === 'Separated' ? 'badge-inactive' : (emp.status === 'Temporary' ? 'badge-neutral' : 'badge-active')}">
                        ${emp.status || 'Active'}
                    </span>
                </td>
                <td class="text-end text-nowrap">
                    <a href="employee_info.html?id=${emp.id}" class="btn-secondary-custom me-1" style="padding:0.35rem 0.6rem;" title="View Profile"><i class="bi bi-person-lines-fill"></i></a>
                    ${(user.role === 'admin' || user.role === 'hr') ? `<a href="employee_edit.html?id=${emp.id}" class="btn-secondary-custom me-1" style="padding:0.35rem 0.6rem;" title="Edit details"><i class="bi bi-pencil-fill"></i></a>` : ''}
                    ${user.role === 'admin' ? `<button class="btn-danger-custom" style="padding:0.35rem 0.6rem;" onclick="deleteEmployee('${emp.id}', '${emp.first_name}')" title="Remove"><i class="bi bi-trash-fill"></i></button>` : ''}
                </td>
            </tr>
        `).join('');

    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger">Failed to connect to the server.</td></tr>`;
    }
}

async function deleteEmployee(id, name) {
    if (!confirm(`Are you certain you want to remove employee "${name}"? This action cannot be undone.`)) return;
    try {
        await API.delete(`/api/employees/${id}`);
        // Refresh directory
        loadDirectory();
    } catch (err) {
        alert(err.message);
    }
}
