/**
 * edit_service.js
 * Handles loading and updating an existing service record.
 */

const urlParams = new URLSearchParams(window.location.search);
const id = urlParams.get('id');
const empId = urlParams.get('empId');

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const s = await API.get(`/api/service_records/${id}`);

        document.getElementById('designation').value = s.designation || '';
        document.getElementById('status').value      = s.status || '';
        document.getElementById('salaryRange').value = s.salary_range || '';
        document.getElementById('station').value     = s.station || '';
        document.getElementById('dateFrom').value    = s.date_from || '';
        document.getElementById('dateTo').value      = s.date_to || '';
        document.getElementById('remarks').value     = s.remarks || '';
    } catch (err) { goBack(); }
});

document.getElementById('editServiceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        designation: document.getElementById('designation').value.trim(),
        status:      document.getElementById('status').value.trim(),
        salary_range:document.getElementById('salaryRange').value.trim(),
        station:     document.getElementById('station').value.trim(),
        date_from:   document.getElementById('dateFrom').value,
        date_to:     document.getElementById('dateTo').value || null,
        remarks:     document.getElementById('remarks').value.trim()
    };

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Updating...';

    try {
        await API.put(`/api/service_records/${id}`, payload);
        API.showToast("Service record updated!");
        API.logActivity(`Updated service record for Employee ${empId}: ${payload.designation}`);
        setTimeout(goBack, 1000);
    } catch (err) {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-save me-2"></i> Update Record';
    }
});

async function deleteRecord() {
    if (!confirm("Delete this service record?")) return;
    try {
        await API.delete(`/api/service_records/${id}`);
        API.showToast("Record deleted successfully!");
        API.logActivity(`Deleted service record ID ${id} (Employee ${empId})`);
        setTimeout(goBack, 1000);
    } catch (err) {}
}

function goBack() {
    window.location.href = `service_record.html?id=${empId}`;
}