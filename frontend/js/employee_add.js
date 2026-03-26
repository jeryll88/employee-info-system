/**
 * employee_add.js
 * Handles employee addition using API utility.
 */

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('addEmployeeForm');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const payload = {
            employee_id: document.getElementById('empId').value.trim(),
            first_name:  document.getElementById('firstName').value.trim(),
            middle_name: document.getElementById('middleName').value.trim(),
            last_name:   document.getElementById('lastName').value.trim(),
            birthday:    document.getElementById('birthday').value,
            position:    document.getElementById('position').value.trim(),
            department:  document.getElementById('department').value.trim(),
            date_hired:  document.getElementById('dateHired').value,
            status:      document.getElementById('status').value
        };

        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Adding...';

        try {
            await API.post('/api/employees', payload);
            API.showToast(`Employee ${payload.first_name} added successfully!`);
            API.logActivity(`Added new employee: ${payload.first_name} ${payload.last_name}`);
            
            setTimeout(() => {
                window.location.href = 'employee_list.html';
            }, 1000);
        } catch (err) {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-person-plus-fill me-2"></i>Add Employee';
        }
    });
});
