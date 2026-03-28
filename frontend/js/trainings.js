const urlParams = new URLSearchParams(window.location.search);
const empId = urlParams.get('id');
const user  = getCurrentUser();

document.addEventListener('DOMContentLoaded', () => {
    if (!empId) {
        alert("No employee specified");
        window.location.href = "employee_list.html";
        return;
    }
    loadTrainings();
    
    // Hide add button if not admin/hr
    if (user.role === 'employee') {
        const addBtn = document.querySelector('.add-btn');
        if (addBtn) addBtn.style.display = 'none';
    }
});

function goBack() {
    window.location.href = `employee_info.html?id=${empId}`;
}

function showAddTrainingForm() {
    document.getElementById('displayEmpId').value = empId;
    document.getElementById('addTrainingForm').style.display = 'block';
}

function hideAddTrainingForm() {
    document.getElementById('addTrainingForm').style.display = 'none';
}

async function loadTrainings() {
    const tableBody = document.querySelector("#trainingsTable tbody");
    try {
        const list = await API.get(`/api/trainings?employee_id=${empId}`);
        
        tableBody.innerHTML = '';
        if (list.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4">No trainings yet</td></tr>`;
            return;
        }

        list.forEach(t => {
            tableBody.innerHTML += `
                <tr>
                    <td><span class="text-dim">#</span>${t.id}</td>
                    <td class="fw-bold">${t.title}</td>
                    <td>${t.training_date}</td>
                    <td>
                        <div class="d-flex justify-content-center gap-2">
                            ${(user.role === 'admin' || user.role === 'hr') ? `
                                <a href="edit_training.html?id=${t.id}&empId=${empId}" class="btn btn-sm btn-outline-warning" title="Edit">
                                    <i class="bi bi-pencil"></i>
                                </a>
                            ` : ''}
                            ${user.role === 'admin' ? `
                                <button class="btn btn-sm btn-outline-danger" onclick="deleteTraining(${t.id}, '${t.title}')" title="Delete">
                                    <i class="bi bi-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>`;
        });
    } catch (err) {
        tableBody.innerHTML = `<tr><td colspan="4" class="text-danger">Error loading data</td></tr>`;
    }
}

async function saveTraining() {
    const title = document.getElementById('trainingTitle').value.trim();
    const date  = document.getElementById('trainingDate').value;

    if (!title || !date) {
        API.showToast("Please fill all fields", "warning");
        return;
    }

    try {
        await API.post('/api/trainings', { employee_id: empId, title, training_date: date });
        API.showToast(`Training "${title}" added successfully!`);
        API.logActivity(`Added Training: ${title} for Employee ${empId}`);
        
        hideAddTrainingForm();
        loadTrainings();
        document.getElementById('trainingTitle').value = '';
        document.getElementById('trainingDate').value = '';
    } catch (err) {}
}

async function deleteTraining(id, title) {
    if (!confirm(`Delete training "${title}"?`)) return;
    try {
        await API.delete(`/api/trainings/${id}`);
        API.showToast(`Training "${title}" deleted`);
        API.logActivity(`Deleted Training: ${title}`);
        loadTrainings();
    } catch (err) {}
}
