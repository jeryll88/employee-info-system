/**
 * edit_employee.js
 * Handles employee data fetching and updating using API utility.
 */

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    const form = document.getElementById('editEmployeeForm');

    if (!id) {
        API.showToast("No Employee ID provided", "danger");
        window.location.href = 'employee_list.html';
        return;
    }

    // 1. Fetch current data
    try {
        const emp = await API.get(`/api/employees/${id}`);
        
        document.getElementById('empId').value      = emp.employee_id || emp.id;
        document.getElementById('firstName').value  = emp.first_name || '';
        document.getElementById('middleName').value = emp.middle_name || '';
        document.getElementById('lastName').value   = emp.last_name || '';
        document.getElementById('birthday').value   = emp.birthday || '';
        document.getElementById('position').value   = emp.position || '';
        document.getElementById('department').value = emp.department || '';
        document.getElementById('dateHired').value  = emp.date_hired || '';
        document.getElementById('status').value    = emp.status || '';
    } catch (err) { /* API utility handles redirect/toast */ }

    // 2. Handle update
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const payload = {
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
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';

        try {
            await API.put(`/api/employees/${id}`, payload);
            API.showToast(`Employee "${payload.first_name}" updated successfully!`);
            API.logActivity(`Updated employee: ${payload.first_name} ${payload.last_name}`);
            
            setTimeout(() => {
                window.location.href = 'employee_list.html';
            }, 1000);
        } catch (err) {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-save me-2"></i>Save Changes';
        }
    });
});
