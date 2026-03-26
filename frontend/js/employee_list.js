let allEmployees = [];
let currentFilter = { search: '', status: '' };
let currentSort   = { key: 'name', dir: 'asc' };

document.addEventListener('DOMContentLoaded', async () => {
    const user = getCurrentUser();
    const adminActions = document.getElementById('adminActions');

    if (user.role === 'admin') {
        adminActions.innerHTML = `
            <a href="employee_add.html" class="btn btn-premium">
                <i class="bi bi-person-plus-fill me-2"></i>Add Employee
            </a>
        `;
    }

    try {
        allEmployees = await API.get('/api/employees');
        renderEmployees();
    } catch (err) {
        document.getElementById('employeeList').innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Failed to load directory.</td></tr>`;
    }
});

function filterEmployees() {
    currentFilter.search = document.getElementById('searchInput').value.toLowerCase();
    currentFilter.status = document.getElementById('statusFilter').value;
    renderEmployees();
}

function resetDirectory() {
    document.getElementById('searchInput').value = '';
    document.getElementById('statusFilter').value = '';
    currentFilter = { search: '', status: '' };
    renderEmployees();
}

function renderEmployees() {
    const listContainer = document.getElementById('employeeList');
    const role = getCurrentUser().role;

    let filtered = allEmployees.filter(emp => {
        const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
        const matchesSearch = !currentFilter.search || 
            fullName.includes(currentFilter.search) || 
            emp.id.toLowerCase().includes(currentFilter.search) ||
            (emp.position && emp.position.toLowerCase().includes(currentFilter.search));
        
        const matchesStatus = !currentFilter.status || emp.status === currentFilter.status;
        
        return matchesSearch && matchesStatus;
    });

    // Sort
    filtered.sort((a, b) => {
        let valA, valB;
        if (currentSort.key === 'name') {
            valA = `${a.first_name} ${a.last_name}`.toLowerCase();
            valB = `${b.first_name} ${b.last_name}`.toLowerCase();
        } else {
            valA = a[currentSort.key] || '';
            valB = b[currentSort.key] || '';
        }
        if (valA < valB) return currentSort.dir === 'asc' ? -1 : 1;
        if (valA > valB) return currentSort.dir === 'asc' ? 1 : -1;
        return 0;
    });

    listContainer.innerHTML = '';
    if (filtered.length === 0) {
        listContainer.innerHTML = '<tr><td colspan="6" class="text-center text-dim py-5">No matching employees found.</td></tr>';
        return;
    }

    filtered.forEach(emp => {
        const statusClass = getStatusClass(emp.status || 'Active');
        listContainer.innerHTML += `
            <tr class="fade-in">
                <td><span class="text-dim">#</span>${emp.id}</td>
                <td>
                    <div class="fw-bold">${emp.first_name} ${emp.last_name}</div>
                    <div class="text-dim smaller">${emp.position || '—'}</div>
                </td>
                <td><span class="small">${emp.department || '—'}</span></td>
                <td><span class="small">${emp.date_hired || '—'}</span></td>
                <td><span class="badge ${statusClass} rounded-pill px-3">${emp.status || 'Active'}</span></td>
                <td class="text-end">
                    <div class="d-flex justify-content-end gap-1">
                        <a href="employee_info.html?id=${emp.id}" class="btn btn-sm btn-outline-info border-0" title="View"><i class="bi bi-eye"></i></a>
                        ${(role === 'admin' || role === 'hr') ? `<a href="employee_edit.html?id=${emp.id}" class="btn btn-sm btn-outline-warning border-0" title="Edit"><i class="bi bi-pencil"></i></a>` : ''}
                        ${role === 'admin' ? `<button class="btn btn-sm btn-outline-danger border-0" onclick="deleteEmployee('${emp.id}', '${emp.first_name}')" title="Delete"><i class="bi bi-trash"></i></button>` : ''}
                    </div>
                </td>
            </tr>
        `;
    });
}

function getStatusClass(status) {
    switch (status) {
        case 'Active':    return 'bg-success-subtle text-success border border-success';
        case 'Permanent': return 'bg-primary-subtle text-primary border border-primary';
        case 'Temporary': return 'bg-warning-subtle text-warning border border-warning';
        case 'Separated': return 'bg-danger-subtle text-danger border border-danger';
        default: return 'bg-secondary-subtle text-secondary';
    }
}

async function deleteEmployee(id, name) {
    if (!confirm(`Are you sure you want to delete employee "${name}"?`)) return;

    try {
        await API.delete(`/api/employees/${id}`);
        API.showToast(`Employee "${name}" deleted successfully.`);
        API.logActivity(`Deleted employee: ${name}`);
        // Refresh local list and re-render
        allEmployees = allEmployees.filter(emp => emp.id !== id);
        renderEmployees();
    } catch (err) { /* Toast shown by API */ }
}
