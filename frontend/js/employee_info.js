/**
 * employee_info.js
 * Handles fetching and displaying employee details using API utility.
 */

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    if (!id) {
        API.showToast("No Employee ID provided", "danger");
        window.location.href = 'employee_list.html';
        return;
    }

    try {
        const emp = await API.get(`/api/employees/${id}`);
        
        // Display data
        document.getElementById('empNumber').textContent = emp.employee_id || emp.id;
        document.getElementById('lastName').textContent  = emp.last_name || '—';
        document.getElementById('firstName').textContent = emp.first_name || '—';
        document.getElementById('birthday').textContent  = emp.birthday || '—';
        document.getElementById('status').textContent    = emp.status || '—';
        document.getElementById('position').textContent  = emp.position || '—';
        document.getElementById('department').textContent = emp.department || '—';
    } catch (err) { /* API utility handles redirect/toast */ }
});

function goBack() {
    window.location.href = 'employee_list.html';
}

function goToTrainings() {
    const id = new URLSearchParams(window.location.search).get('id');
    window.location.href = `trainings.html?id=${id}`;
}

function goToServiceRecords() {
    const id = new URLSearchParams(window.location.search).get('id');
    window.location.href = `service_record.html?id=${id}`;
}

function goToPayroll() {
    const id = new URLSearchParams(window.location.search).get('id');
    window.location.href = `payroll.html?id=${id}`;
}