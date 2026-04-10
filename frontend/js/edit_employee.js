/**
 * edit_employee.js
 * Handles loading and updating an existing employee record.
 */

const active_user = getCurrentUser();
const urlParams = new URLSearchParams(window.location.search);
const targetId = urlParams.get('id');

if (!active_user) window.location.replace('login.html');
else if (active_user.role !== 'admin' && active_user.role !== 'hr') {
    if (active_user.role !== 'employee' || active_user.employee_id !== targetId) {
        window.location.replace('dashboard.html');
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    if (!targetId) return window.history.back();
    try {
        const emp = await API.get(`/api/employees/${targetId}`);
        document.getElementById('empId').value = emp.id || emp.employee_id || '';
        document.getElementById('firstName').value = emp.first_name || '';
        document.getElementById('middleName').value = emp.middle_name || '';
        document.getElementById('lastName').value = emp.last_name || '';

        // Dates are returned as YYYY-MM-DD strings — set directly
        document.getElementById('birthday').value = (emp.birthday || '').substring(0, 10);
        document.getElementById('position').value = emp.position || '';
        document.getElementById('department').value = emp.department || '';
        document.getElementById('dateHired').value = (emp.date_hired || '').substring(0, 10);

        const statusSel = document.getElementById('status');
        if (emp.status) {
            statusSel.value = emp.status;
            // If value not in options, add it dynamically
            if (statusSel.value !== emp.status) {
                const opt = document.createElement('option');
                opt.value = emp.status;
                opt.textContent = emp.status;
                statusSel.appendChild(opt);
                statusSel.value = emp.status;
            }
        }
    } catch (e) {
        document.getElementById('formMsg').innerText = 'Failed to load employee data.';
    }
});

document.getElementById('editEmployeeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    const msg = document.getElementById('formMsg');

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';
    msg.innerText = '';

    const payload = {
        first_name: document.getElementById('firstName').value.trim(),
        middle_name: document.getElementById('middleName').value.trim(),
        last_name: document.getElementById('lastName').value.trim(),
        birthday: document.getElementById('birthday').value || null,
        position: document.getElementById('position').value.trim(),
        department: document.getElementById('department').value.trim(),
        date_hired: document.getElementById('dateHired').value || null,
        status: document.getElementById('status').value
    };

    try {
        await API.put(`/api/employees/${targetId}`, payload);
        msg.classList.remove('text-danger');
        msg.classList.add('text-success');
        msg.innerText = 'Record Updated Successfully!';
        API.logActivity(`Updated employee: ${payload.first_name} ${payload.last_name}`);
        setTimeout(() => window.location.href = 'employee_list.html', 1000);
    } catch (err) {
        msg.classList.add('text-danger');
        msg.innerText = err.message || 'Failed to update employee.';
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-save me-2"></i> Update Record';
    }
});
