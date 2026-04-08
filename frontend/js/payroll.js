if (!requireAuth()) { /* redirects */ }

const user = getCurrentUser();
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

document.addEventListener('DOMContentLoaded', () => {
    if (!user) return;
    if (user.role === 'employee') {
        // Employee: only sees their own history, no generator
        loadHistory(user.employee_id);
    } else {
        // Admin / HR: show generator + search
        document.getElementById('generatorCard').style.display = 'block';
        document.getElementById('historySearchBox').style.display = 'block';
        loadHistory(); // Load recent payslips
    }
});

async function generatePayroll(e) {
    e.preventDefault();
    const btn = document.getElementById('btnGenerate');
    const msg = document.getElementById('genMsg');
    const empId = document.getElementById('empIdInput').value.trim();

    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i> Calculating...';
    msg.innerText = '';
    document.getElementById('payslipResult').style.display = 'none';

    try {
        const res = await API.post('/api/payroll/generate', { employee_id: empId });
        renderPayslip(res);
        API.showToast('Payslip generated and saved!', 'success');
        API.logActivity(`Generated payslip for ${empId} — Net: PHP ${res.net_salary}`);
        loadHistory(empId);
    } catch (err) {
        msg.innerText = err.message || 'Failed to generate. Check if Service Records exist.';
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-receipt me-2"></i> Calculate & Save Payslip';
    }
}

function renderPayslip(res) {
    document.getElementById('psEmpName').innerText      = res.employee_name || 'Unknown';
    document.getElementById('psEmpId').innerText        = res.employee_id;
    document.getElementById('psBase').innerText         = 'PHP ' + res.base_salary;
    document.getElementById('psDays').innerText         = res.work_days;
    document.getElementById('psAllow').innerText        = '+ PHP ' + res.allowance;
    document.getElementById('psDeduct').innerText       = '- PHP ' + res.deductions;
    document.getElementById('psLeaveDeduct').innerText  = '- PHP ' + (res.leave_deductions || '0.00');
    document.getElementById('psTax').innerText          = '- PHP ' + res.tax;
    document.getElementById('psNet').innerText          = 'PHP ' + res.net_salary;
    document.getElementById('psGeneratedBy').innerText  = res.generated_by || 'System';
    document.getElementById('payslipPeriod').innerText  = res.period || '';
    document.getElementById('payslipResult').style.display = 'block';
    document.getElementById('payslipResult').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderPayslipFromRecord(rec) {
    const monthName = MONTHS[(rec.period_month || 1) - 1] + ' ' + rec.period_year;
    const fmtNum = n => parseFloat(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 });
    renderPayslip({
        employee_id:  rec.employee_id,
        employee_name: rec.employee_name,
        base_salary:  fmtNum(rec.base_salary),
        work_days:    rec.work_days,
        allowance:    fmtNum(rec.allowance),
        deductions:   fmtNum(rec.deductions),
        leave_deductions: fmtNum(rec.leave_deductions),
        tax:          fmtNum(rec.tax),
        net_salary:   fmtNum(rec.net_salary),
        generated_by: rec.generated_by || 'System',
        period:       monthName
    });
}

async function deletePayroll(id, event) {
    if (event) event.stopPropagation();
    if (!confirm('Are you sure you want to delete this payslip record?')) return;

    try {
        await API.delete(`/api/payroll/${id}`);
        API.showToast('Payslip record deleted', 'success');
        // Refresh history
        const empIdInput = document.getElementById('empIdInput');
        loadHistory(user.role === 'employee' ? user.employee_id : (empIdInput ? empIdInput.value.trim() : ''));
    } catch (err) {
        API.showToast(err.message || 'Failed to delete record', 'error');
    }
}

async function loadHistory(empId) {
    const listEl = document.getElementById('payrollHistoryList');
    listEl.innerHTML = '<div class="text-dim text-center py-4">Loading...</div>';

    let url = '/api/payroll';
    if (empId) url += `?employee_id=${encodeURIComponent(empId)}`;

    try {
        const records = await API.get(url);
        if (!records.length) {
            listEl.innerHTML = '<div class="text-dim text-center py-4"><i class="bi bi-inbox text-dim fs-2 d-block mb-2"></i>No payslips on record yet.</div>';
            return;
        }

        listEl.innerHTML = records.map(rec => {
            const monthName = MONTHS[(rec.period_month || 1) - 1] + ' ' + rec.period_year;
            const netFmt    = parseFloat(rec.net_salary || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 });
            const dateFmt   = rec.created_at ? new Date(rec.created_at).toLocaleDateString('en-PH') : '';
            return `
            <div class="history-item" onclick='renderPayslipFromRecord(${JSON.stringify(rec).replace(/'/g, "&apos;")})'>
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <div class="fw-bold text-white">${rec.employee_name || rec.employee_id}</div>
                        <div class="text-dim small mt-1">${rec.employee_id} | ${dateFmt} &nbsp;|&nbsp; Generated by: ${rec.generated_by || 'System'}</div>
                    </div>
                    <div class="text-end d-flex flex-column align-items-end">
                        <div class="d-flex align-items-center gap-2">
                            <span class="period-badge">${monthName}</span>
                            ${(user.role === 'admin' || user.role === 'hr') ? `
                                <button class="btn btn-link text-danger p-0 delete-payroll-btn" onclick="deletePayroll(${rec.id}, event)" title="Delete Record">
                                    <i class="bi bi-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                        <div class="text-success fw-bold mt-1">PHP ${netFmt}</div>
                    </div>
                </div>
            </div>`;
        }).join('');
    } catch (e) {
        listEl.innerHTML = '<div class="text-danger text-center py-4">Failed to load payslip history.</div>';
    }
}