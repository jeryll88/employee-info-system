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
    loadEvaluations();
    
    // Admins and HR can add reviews.
    if (user.role === 'employee') {
        document.getElementById('addBtn').style.display = 'none';
        if (user.employee_id !== empId) {
            window.location.replace(`employee_info.html?id=${user.employee_id}`);
        }
    }
});

function goBack() {
    window.location.href = `employee_info.html?id=${empId}`;
}

function showAddEvalForm() {
    document.getElementById('addEvalForm').style.display = 'block';
    document.getElementById('evalDate').value = new Date().toISOString().split('T')[0];
}

function hideAddEvalForm() {
    document.getElementById('addEvalForm').style.display = 'none';
    document.getElementById('evalDate').value = '';
    document.getElementById('evalRating').value = '';
    document.getElementById('evalComments').value = '';
}

async function loadEvaluations() {
    const tableBody = document.querySelector("#evalsTable tbody");
    try {
        const list = await API.get(`/api/performance?employee_id=${empId}`);
        
        tableBody.innerHTML = '';
        if (list.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="py-4 text-dim">No performance reviews logged yet.</td></tr>`;
            return;
        }

        list.forEach(e => {
            tableBody.innerHTML += `
                <tr>
                    <td class="text-dim">${e.evaluation_date}</td>
                    <td class="fw-bold">${e.reviewer}</td>
                    <td><span class="badge bg-success p-2"><i class="bi bi-star-fill me-1"></i>${e.rating}</span></td>
                    <td style="white-space:normal; max-width:250px;" class="small">${e.comments || '—'}</td>
                    <td>
                        <div class="d-flex justify-content-center gap-2">
                            ${(user.role === 'admin' || user.role === 'hr') ? `
                                <button class="btn btn-sm btn-outline-danger" onclick="deleteEvaluation(${e.id})" title="Delete">
                                    <i class="bi bi-trash"></i>
                                </button>
                            ` : '—'}
                        </div>
                    </td>
                </tr>`;
        });
    } catch (err) {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-danger">Error loading data</td></tr>`;
    }
}

async function saveEvaluation() {
    const date = document.getElementById('evalDate').value;
    const rating = document.getElementById('evalRating').value;
    const comments = document.getElementById('evalComments').value;

    if (!date || !rating) {
        API.showToast("Please provide date and rating", "warning");
        return;
    }

    try {
        await API.post('/api/performance', { 
            employee_id: empId, 
            evaluation_date: date, 
            rating: parseFloat(rating), 
            comments: comments, 
            reviewer: user.username 
        });
        API.showToast(`Review added successfully!`);
        hideAddEvalForm();
        loadEvaluations();
    } catch (err) {}
}

async function deleteEvaluation(id) {
    if (!confirm(`Delete this performance review permanently?`)) return;
    try {
        await API.delete(`/api/performance/${id}`);
        API.showToast(`Review deleted`);
        loadEvaluations();
    } catch (err) {}
}
