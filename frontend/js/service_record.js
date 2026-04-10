if (!requireAuth()) { /* redirects handled inside */ }

const urlParams = new URLSearchParams(window.location.search);
const empId = urlParams.get('id');
const user  = getCurrentUser();

document.addEventListener('DOMContentLoaded', () => {
    if (!empId) {
        alert("No employee specified");
        window.location.href = "employee_list.html";
        return;
    }
    loadServiceRecords();
    
    if (user.role === 'employee') {
        const addBtn = document.querySelector('.add-btn');
        if (addBtn) addBtn.style.display = 'none';
    }
});

async function loadServiceRecords() {
    const tableBody = document.querySelector("#serviceTable tbody");
    try {
        const list = await API.get(`/api/service_records?employee_id=${empId}`);
        
        tableBody.innerHTML = '';
        if (list.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="8" class="text-dim py-5">No service records found for this employee.</td></tr>`;
            return;
        }

        list.forEach(s => {
            const dateFrom = s.date_from || '—';
            const dateTo   = s.date_to || '<span class="text-success small fw-bold">PRESENT</span>';
            const remarks  = s.remarks ? (s.remarks.length > 30 ? s.remarks.substring(0, 30) + '...' : s.remarks) : '—';

            tableBody.innerHTML += `
                <tr>
                    <td><span class="text-dim">#</span>${s.id}</td>
                    <td class="fw-bold">${s.designation}</td>
                    <td>${s.status || '—'}</td>
                    <td>${s.salary_range || '—'}</td>
                    <td>${s.station || '—'}</td>
                    <td class="small">${dateFrom} <i class="bi bi-arrow-right mx-1 text-dim"></i> ${dateTo}</td>
                    <td class="small text-dim" title="${s.remarks || ''}">${remarks}</td>
                    <td>
                        <div class="d-flex justify-content-center gap-2">
                            ${(user.role === 'admin' || user.role === 'hr') ? `
                                <a href="edit_service.html?id=${s.id}&empId=${empId}" class="btn btn-sm btn-outline-warning" title="Edit">
                                    <i class="bi bi-pencil"></i>
                                </a>
                                <button class="btn btn-sm btn-outline-danger" onclick="deleteServiceRecord(${s.id}, '${s.designation}')" title="Delete">
                                    <i class="bi bi-trash"></i>
                                </button>
                            ` : '—'}
                        </div>
                    </td>
                </tr>`;
        });
    } catch (err) {
        tableBody.innerHTML = `<tr><td colspan="8" class="text-danger py-4">Error loading data. Please check your connection.</td></tr>`;
    }
}

async function deleteServiceRecord(id, designation) {
    if (!confirm(`Are you sure you want to delete the service record for "${designation}"?`)) return;
    try {
        await API.delete(`/api/service_records/${id}`);
        API.showToast("Service record deleted successfully!", "success");
        API.logActivity(`Deleted service record: ${designation} (ID: ${id})`);
        loadServiceRecords();
    } catch (err) {
        alert(err.message || "Failed to delete service record.");
    }
}

function addService() {
    window.location.href = `add_service.html?empId=${empId}`;
}

function goBack() {
    window.location.href = `employee_info.html?id=${empId}`;
}
