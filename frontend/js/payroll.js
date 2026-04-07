if (!requireAuth()) { /* redirects */ }

const user = getCurrentUser();
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
let currentPayslipId = null;

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
        renderPayslip(res, res.id);
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

function renderPayslip(res, id = null) {
    currentPayslipId = id;
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
    
    // Show delete button in detail if we have an ID
    const deleteBtn = document.getElementById('btnDeleteDetail');
    if (deleteBtn) {
        deleteBtn.style.display = id ? 'inline-block' : 'none';
    }

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
    }, rec.id);
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

        // Group by employee
        const groups = {};
        records.forEach(rec => {
            const key = rec.employee_id;
            if (!groups[key]) groups[key] = [];
            groups[key].push(rec);
        });

        const sortedIds = Object.keys(groups).sort((a, b) => {
            const na = groups[a][0].employee_name || a;
            const nb = groups[b][0].employee_name || b;
            return na.localeCompare(nb);
        });

        listEl.innerHTML = sortedIds.map(empId => {
            const empName = groups[empId][0].employee_name || empId;
            const empRecords = groups[empId];
            
            const historyItems = empRecords.map(rec => {
                const monthName = MONTHS[(rec.period_month || 1) - 1] + ' ' + rec.period_year;
                const netFmt    = parseFloat(rec.net_salary || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 });
                const dateFmt   = rec.created_at ? new Date(rec.created_at).toLocaleDateString('en-PH') : '';
                return `
                <div class="history-item mb-2" onclick='renderPayslipFromRecord(${JSON.stringify(rec).replace(/'/g, "&apos;")})' style="padding: 8px 12px; background: rgba(255,255,255,0.03); border-radius:6px;">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <div class="text-white small fw-bold">${monthName}</div>
                            <div class="text-dim" style="font-size: 11px;">${dateFmt} &nbsp;|&nbsp; By: ${rec.generated_by || 'System'}</div>
                        </div>
                        <div class="text-end d-flex align-items-center gap-3">
                            <div class="text-success fw-bold small">PHP ${netFmt}</div>
                            <button class="btn btn-link text-danger p-0 delete-btn-payroll" 
                                onclick="deletePayroll(${rec.id}, event)" 
                                title="Delete Record">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>`;
            }).join('');

            return `
            <div class="employee-payroll-group mb-3">
                <div class="d-flex align-items-center justify-content-between p-2 clickable-header" 
                     onclick="window.location.href='employee_history.html?id=${empId}&tab=payroll'"
                     style="background: rgba(255,255,255,0.05); border-radius: 8px; cursor: pointer; transition: background 0.2s;">
                    <div class="d-flex align-items-center gap-2">
                         <div class="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white"
                                 style="width:32px;height:32px;background:linear-gradient(135deg,#10b981,#059669);font-size:12px;flex-shrink:0;">
                            ${empName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div class="fw-bold text-white small">${empName}</div>
                            <div class="text-dim" style="font-size: 11px;">${empId} &bull; ${empRecords.length} record${empRecords.length > 1 ? 's' : ''}</div>
                        </div>
                    </div>
                    <i class="bi bi-arrow-right text-dim transition-icon"></i>
                </div>
            </div>`;
        }).join('');
    } catch (e) {
        listEl.innerHTML = '<div class="text-danger text-center py-4">Failed to load payslip history.</div>';
    }
}

function toggleHistory(id, headerEl) {
    const el = document.getElementById(id);
    const icon = headerEl.querySelector('.bi-chevron-down, .bi-chevron-up');
    
    if (el.style.display === 'none') {
        el.style.display = 'block';
        if (icon) {
            icon.classList.remove('bi-chevron-down');
            icon.classList.add('bi-chevron-up');
        }
        headerEl.style.background = 'rgba(255,255,255,0.1)';
    } else {
        el.style.display = 'none';
        if (icon) {
            icon.classList.remove('bi-chevron-up');
            icon.classList.add('bi-chevron-down');
        }
        headerEl.style.background = 'rgba(255,255,255,0.05)';
    }
}

async function deletePayroll(id, event) {
    if (event) event.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this payroll record? This action cannot be undone.')) {
        return;
    }

    try {
        await API.delete(`/api/payroll/${id}`);
        API.showToast('Payroll record deleted successfully', 'success');
        
        // If we just deleted the record currently shown in detail view, hide it
        if (currentPayslipId === id) {
            document.getElementById('payslipResult').style.display = 'none';
            currentPayslipId = null;
        }

        // Reload history
        loadHistory(user.role === 'employee' ? user.employee_id : document.getElementById('histEmpId').value.trim());
    } catch (err) {
        API.showToast(err.message || 'Failed to delete record', 'danger');
    }
}

function deleteCurrentPayslip() {
    if (currentPayslipId) {
        deletePayroll(currentPayslipId);
    }
}