/**
 * edit_training.js
 * Handles training data fetching and updating using API utility.
 */

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    const empId = urlParams.get('empId');
    const form = document.getElementById('editTrainingForm');
    const cancelBtn = document.getElementById('cancelBtn');

    if (empId) cancelBtn.href = `trainings.html?id=${empId}`;

    if (!id) {
        API.showToast("No Training ID provided", "danger");
        window.location.href = empId ? `trainings.html?id=${empId}` : 'employee_list.html';
        return;
    }

    // 1. Fetch current data
    try {
        const training = await API.get(`/api/trainings/${id}`);
        document.getElementById('title').value = training.title || '';
        document.getElementById('date').value  = training.training_date || '';
    } catch (err) { /* API utility handles redirect/toast */ }

    // 2. Handle update
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const payload = {
            title: document.getElementById('title').value.trim(),
            training_date: document.getElementById('date').value
        };

        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';

        try {
            await API.put(`/api/trainings/${id}`, payload);
            API.showToast(`Training updated successfully!`);
            API.logActivity(`Updated Training: ${payload.title}`);
            
            setTimeout(() => {
                window.location.href = `trainings.html?id=${empId}`;
            }, 1000);
        } catch (err) {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-save me-2"></i>Save Changes';
        }
    });
});