if (!requireRole('admin')) {}

document.addEventListener('DOMContentLoaded', loadUsers);

async function loadUsers() {
    const tbody = document.getElementById('usersListBody');
    try {
        const users = await API.get('/api/users');
        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-dim py-4">No accounts found.</td></tr>';
            return;
        }

        tbody.innerHTML = users.map(u => `
            <tr>
                <td class="text-dim">#${u.id}</td>
                <td class="fw-bold">${u.username}</td>
                <td>${getRoleBadgeHtml(u.role)}</td>
                <td><span class="badge bg-secondary border border-light text-light px-2 py-1">${u.employee_id || 'unlinked'}</span></td>
                <td class="text-dim small">${u.created_at || '—'}</td>
                <td>
                    ${u.role !== 'admin' || u.id !== getCurrentUser().id ? `
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteUser(${u.id}, '${u.username}')" title="Revoke Account">
                            <i class="bi bi-trash-fill"></i>
                        </button>
                    ` : '<span class="text-dim small">Current Session</span>'}
                </td>
            </tr>
        `).join('');

    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-danger py-4">Failed to load system accounts.</td></tr>';
    }
}

async function createUser(e) {
    e.preventDefault();
    const btn = document.getElementById('btnCreate');
    const msg = document.getElementById('addMsg');
    
    btn.disabled = true;
    msg.innerText = '';
    
    const payload = {
        username: document.getElementById('newUsername').value.trim(),
        password: document.getElementById('newPassword').value.trim(),
        role: document.getElementById('newRole').value,
        employee_id: document.getElementById('newEmpId').value.trim() || null
    };

    try {
        await API.post('/api/users', payload);
        document.getElementById('addUserForm').reset();
        API.showToast("Account successfully created!", "success");
        loadUsers();
    } catch (err) {
        msg.innerText = err.message || "Failed to create account.";
    } finally {
        btn.disabled = false;
    }
}

async function deleteUser(id, username) {
    if(!confirm(`Are you absolutely sure you want to permanently revoke system access for "${username}"?`)) return;
    try {
        await API.delete(`/api/users/${id}`);
        API.showToast(`Account revoked.`);
        loadUsers();
    } catch (err) {
        alert(err.message);
    }
}
