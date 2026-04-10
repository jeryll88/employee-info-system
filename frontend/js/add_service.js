/**
 * add_service.js
 * Handles adding a new service record for an employee.
 */

const urlParams = new URLSearchParams(window.location.search);
const empId = urlParams.get('empId');
document.getElementById('displayEmpId').value = empId;

document.getElementById('serviceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        employee_id: empId,
        designation: document.getElementById('designation').value.trim(),
        status: document.getElementById('status').value.trim(),
        salary_range: document.getElementById('salaryRange').value.trim(),
        station: document.getElementById('station').value.trim(),
        date_from: document.getElementById('dateFrom').value,
        date_to: document.getElementById('dateTo').value || null,
        remarks: document.getElementById('remarks').value.trim()
    };

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';

    try {
        await API.post('/api/service_records', payload);
        API.showToast("Service record saved successfully!");
        API.logActivity(`Added service record for Employee ${empId}: ${payload.designation}`);
        setTimeout(goBack, 1000);
    } catch (err) {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-save me-2"></i> Save Record';
    }
});

function goBack() {
    window.location.href = `service_record.html?id=${empId}`;
}