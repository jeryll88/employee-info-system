/**
 * payroll.js
 * Handles payroll generation using API utility.
 */

document.addEventListener('DOMContentLoaded', () => {
    const btn    = document.getElementById('generatePayrollBtn');
    const result = document.getElementById('result');
    const empInput = document.getElementById('empId');

    btn.addEventListener('click', async () => {
        const empId = empInput.value.trim();
        if (!empId) {
            API.showToast("Please enter an Employee ID", "warning");
            return;
        }

        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Calculating...';
        result.innerHTML = '';
        try {
            const data = await API.post('/api/payroll/generate', { employee_id: empId });
            
            result.innerHTML = `
                <div class="premium-card text-start fade-in" style="background: rgba(99, 102, 241, 0.05); border-color: var(--accent);">
                    <div class="text-dim small mb-2 text-uppercase letter-spacing-1">GENERATED PAYSLIP</div>
                    <div class="h3 mb-1" style="color: var(--accent); font-weight: 800;">PHP ${data.net_salary}</div>
                    <div class="text-dim smaller">Employee ID: ${data.employee_id}</div>
                    <div class="mt-3 small">
                        <i class="bi bi-check-circle-fill text-success me-1"></i> Includes standard deductions & bonuses.
                    </div>
                </div>
            `;
            
            API.logActivity(`Generated payroll for: ${empId}`);
        } catch (err) {
            // API utility shows toast
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-cpu me-2"></i> Calculate Net Salary';
        }
    });
});