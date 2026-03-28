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
            tableBody.innerHTML = `<tr><td colspan="5">No service records yet</td></tr>`;
            return;
        }

        list.forEach(s => {
            tableBody.innerHTML += `
                <tr>
                    <td><span class="text-dim">#</span>${s.id}</td>
                    <td class="fw-bold">${s.designation}</td>
                    <td>${s.date_from || '—'}</td>
                    <td>${s.date_to || '<span class="text-success small fw-bold">PRESENT</span>'}</td>
                    <td>
                        <div class="d-flex justify-content-center gap-2">
                            ${(user.role === 'admin' || user.role === 'hr') ? `
                                <a href="edit_service.html?id=${s.id}&empId=${empId}" class="btn btn-sm btn-outline-warning" title="Edit">
                                    <i class="bi bi-pencil"></i>
                                </a>
                            ` : '—'}
                        </div>
                    </td>
                </tr>`;
        });
    } catch (err) {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-danger">Error loading data</td></tr>`;
    }
}

function addService() {
    window.location.href = `add_service.html?empId=${empId}`;
}

function goBack() {
    window.location.href = `employee_info.html?id=${empId}`;
}
