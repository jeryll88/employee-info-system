/**
 * employee_add.js
 * Handles registering a new employee via the API.
 */

if (!requireRole('admin', 'hr')) {}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const data = await API.get('/api/employees/next-id');
        if (data && data.next_id) {
            const idField = document.getElementById('empId');
            idField.value = data.next_id;
            idField.setAttribute('readonly', 'true');
            idField.style.background = 'rgba(255,255,255,0.05)';
        }
    } catch (e) {
        console.error("Could not fetch next ID", e);
    }
});

document.getElementById('addEmployeeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    const msg = document.getElementById('formMsg');
    
    btn.disabled = true;
    btn.innerText = 'Creating...';
    msg.innerText = '';
    
    const payload = {
        id: document.getElementById('empId').value.trim(),
        first_name: document.getElementById('firstName').value.trim(),
        middle_name: document.getElementById('middleName').value.trim(),
        last_name: document.getElementById('lastName').value.trim(),
        birthday: document.getElementById('birthday').value,
        position: document.getElementById('position').value.trim(),
        department: document.getElementById('department').value.trim(),
        date_hired: document.getElementById('dateHired').value,
        status: document.getElementById('status').value
    };

    try {
        await API.post('/api/employees', payload);
        msg.classList.remove('text-danger');
        msg.classList.add('text-success');
        msg.innerText = 'Record Created Successfully!';
        setTimeout(() => window.location.href = 'employee_list.html', 1000);
    } catch (err) {
        msg.innerText = err.message || 'Failed to create employee.';
        btn.disabled = false;
        btn.innerText = 'Create Employee Record';
    }
});
