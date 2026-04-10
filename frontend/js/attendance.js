/**
 * attendance.js
 * Full attendance module: employee check-in/out panel + admin accordion view.
 */

const user = getCurrentUser();
let currentEmpId = user.employee_id || ''; // Tracks the employee being viewed/marked

// ─── Utility: compute duration from time strings ─────────────
function calcDuration(timeIn, timeOut) {
    if (!timeIn || !timeOut) return '—';
    const [h1, m1] = timeIn.split(':').map(Number);
    const [h2, m2] = timeOut.split(':').map(Number);
    const totalMin = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (totalMin <= 0) return '—';
    const hrs = Math.floor(totalMin / 60);
    const mins = totalMin % 60;
    return `${hrs}h ${mins}m`;
}

function formatTime12Hour(timeStr) {
    if (!timeStr) return '—';
    const [h, m] = timeStr.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, '0')} ${suffix}`;
}

// ─── Live Clock ───────────────────────────────────────────────
function startClock() {
    const clockEl = document.getElementById('clockTime');
    const dateEl  = document.getElementById('clockDate');
    if (!clockEl) return;
    const tick = () => {
        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString('en-US', { hour12: true });
        dateEl.textContent  = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    };
    tick();
    setInterval(tick, 1000);
}

// ─── Employee Panel ───────────────────────────────────────────
async function initEmployeePanel() {
    document.getElementById('employeeCheckInPanel').style.display = 'block';
    startClock();
    initCalendar();
    await checkTodayStatus();
    await loadAttendance(user.employee_id);
}

let calendar = null;
function initCalendar() {
    const calendarEl = document.getElementById('attendanceCalendar');
    if (!calendarEl) return;
    
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: false, // Custom toolbar used
        height: 'auto',
        dayHeaderContent: function(arg) {
            return arg.date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
        },
        events: [],
        dateClick: function(info) {
            markAttendanceForDate(info.dateStr);
        },
        eventContent: function(arg) {
            let el = document.createElement('div');
            el.className = `status-dot status-dot-${arg.event.extendedProps.status.toLowerCase().replace(' ', '-')}`;
            return { domNodes: [el] };
        },
        didMount: function() {
            updateCalendarTitle();
        },
        datesSet: function() {
            updateCalendarTitle();
        }
    });
    calendar.render();
}

function updateCalendarTitle() {
    const titleEl = document.getElementById('calendarTitle');
    if (titleEl && calendar) {
        titleEl.textContent = calendar.view.title;
    }
}

let currentLogs = [];

async function markAttendanceForDate(dateStr) {
    if (user.role === 'employee') {
        const log = currentLogs.find(a => a.attendance_date === dateStr);
        const status = log ? (log.status || 'Present') : 'No record';
        API.showToast(`Status for ${dateStr}: ${status}`, 'info');
        return;
    }

    if (!currentEmpId) {
        alert('Please Load Records for an employee first.');
        return;
    }

    // "Late" is excluded from manual marking as it is now automated
    const status = prompt(`Update status for ${dateStr}:\n(Present, Absent, On Leave)`, 'Present');
    if (!status) return;
    
    const lower = status.toLowerCase();
    let chosen = 'Present';
    if (lower.startsWith('p')) chosen = 'Present';
    else if (lower.startsWith('a')) chosen = 'Absent';
    else if (lower.startsWith('o')) chosen = 'On Leave';

    try {
        await API.post('/api/attendance', {
            employee_id: currentEmpId,
            attendance_date: dateStr,
            status: chosen
        });
        API.showToast(`Marked as ${chosen} for ${dateStr}`, 'success');
        await loadAttendance(currentEmpId);
    } catch (err) {
        alert(err.message || 'Failed to save status.');
    }
}

async function checkTodayStatus() {
    const badge     = document.getElementById('todayStatusBadge');
    const infoEl    = document.getElementById('timeRecordedInfo');
    const btnIn     = document.getElementById('btnCheckIn');
    const btnOut    = document.getElementById('btnCheckOut');

    try {
        const rec = await API.get('/api/attendance/today');

        if (!rec || !rec.time_in) {
            badge.className      = 'status-badge status-none';
            badge.innerHTML      = '<i class="bi bi-circle-fill" style="font-size:8px;"></i> Not Checked In';
            infoEl.innerHTML     = '';
            btnIn.disabled       = false;
            btnOut.disabled      = true;
        } else if (rec.time_in && !rec.time_out) {
            badge.className       = 'status-badge status-in';
            badge.innerHTML       = '<i class="bi bi-circle-fill" style="font-size:8px;"></i> CHECKED IN';
            infoEl.innerHTML      = `<i class="bi bi-clock me-1"></i> In at <strong class="text-white">${formatTime12Hour(rec.time_in)}</strong>`;
            btnIn.disabled        = true;
            btnOut.disabled       = false;
        } else {
            badge.className       = 'status-badge status-out';
            badge.innerHTML       = '<i class="bi bi-check-circle-fill" style="font-size:14px;"></i> CLOCKED OUT';
            infoEl.innerHTML      = `
                <div><i class="bi bi-box-arrow-in-right me-1"></i> Last In: <strong class="text-white">${formatTime12Hour(rec.time_in)}</strong></div>
                <div><i class="bi bi-box-arrow-right me-1"></i> Last Out: <strong class="text-white">${formatTime12Hour(rec.time_out)}</strong>
                &nbsp;|&nbsp; <span class="text-success">${calcDuration(rec.time_in, rec.time_out)}</span></div>`;
            btnIn.disabled        = false;
            btnOut.disabled       = true;
        }
    } catch (e) {
        badge.className = 'status-badge status-none';
    }
}

async function doCheckIn() {
    const btn = document.getElementById('btnCheckIn');
    const msg = document.getElementById('checkMsg');
    btn.disabled = true;
    msg.textContent = '';

    const now  = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const date = `${yyyy}-${mm}-${dd}`;
    const time = now.toTimeString().split(' ')[0];

    try {
        await API.post('/api/attendance', {
            attendance_date: date,
            time_in: time,
            time_out: null
        });
        API.showToast('Checked in successfully!', 'success');
        API.logActivity('Checked in to work');
        await checkTodayStatus();
        await loadAttendance(user.employee_id);
    } catch (err) {
        msg.textContent = err.message || 'Check-in failed.';
        btn.disabled = false;
    }
}

async function doCheckOut() {
    const btn = document.getElementById('btnCheckOut');
    const msg = document.getElementById('checkMsg');
    btn.disabled = true;
    msg.textContent = '';

    try {
        await API.put('/api/attendance/checkout', {});
        API.showToast('Checked out successfully!', 'success');
        API.logActivity('Checked out from work');
        await checkTodayStatus();
        await loadAttendance(user.employee_id);
    } catch (err) {
        msg.textContent = err.message || 'Check-out failed.';
        btn.disabled = false;
    }
}

function initAdminPanel() {
    document.getElementById('adminPanel').style.display = 'block';
    initCalendar();
    loadStaffList();
}

async function loadStaffList() {
    const listEl = document.getElementById('employeeAccordion');
    try {
        const staff = await API.get('/api/employees');
        if (!staff.length) {
            listEl.innerHTML = '<div class="text-dim text-center py-5">No employees found.</div>';
            return;
        }

        listEl.innerHTML = staff.map(emp => `
            <div class="employee-card" data-name="${emp.first_name} ${emp.last_name}" data-id="${emp.id}">
                <div class="employee-row" onclick="toggleEmployee('${emp.id}')">
                    <div class="employee-info">
                        <h6>${emp.first_name} ${emp.last_name}</h6>
                        <span>${emp.id} &nbsp;|&nbsp; ${emp.department || 'No Dept'} &nbsp;|&nbsp; ${emp.position || 'No Title'}</span>
                    </div>
                    <i class="bi bi-chevron-down chevron-icon"></i>
                </div>
                <div id="details-${emp.id}" class="employee-details">
                    <div class="row g-4 mb-4">
                        <div class="col-md-3"><div class="stat-box"><div class="h4 mb-0 text-success" id="pres-${emp.id}">0</div><div class="small text-dim">Present</div></div></div>
                        <div class="col-md-3"><div class="stat-box"><div class="h4 mb-0 text-danger" id="abs-${emp.id}">0</div><div class="small text-dim">Absent</div></div></div>
                        <div class="col-md-3"><div class="stat-box"><div class="h4 mb-0 text-warning" id="late-${emp.id}">0</div><div class="small text-dim">Late</div></div></div>
                        <div class="col-md-3"><div class="stat-box"><div class="h4 mb-0 text-primary" id="leave-${emp.id}">0</div><div class="small text-dim">On Leave</div></div></div>
                    </div>
                    <div class="table-responsive bg-dark rounded p-3 border border-secondary">
                        <table class="table table-dark table-hover text-center align-middle">
                            <thead>
                                <tr class="text-dim small text-uppercase">
                                    <th>Date</th>
                                    <th>Check In</th>
                                    <th>Check Out</th>
                                    <th>Duration</th>
                                    <th class="text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="tbody-${emp.id}">
                                <tr><td colspan="5" class="py-4"><div class="spinner-border spinner-border-sm text-dim"></div></td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (e) {
        listEl.innerHTML = '<div class="text-danger text-center py-5">Error loading staff list.</div>';
    }
}

function filterStaffList() {
    const q = document.getElementById('staffSearchInput').value.toLowerCase();
    const cards = document.querySelectorAll('.employee-card');
    cards.forEach(card => {
        const name = card.getAttribute('data-name').toLowerCase();
        const id   = card.getAttribute('data-id').toLowerCase();
        card.style.display = (name.includes(q) || id.includes(q)) ? 'block' : 'none';
    });
}

async function toggleEmployee(empId) {
    const row  = document.querySelector(`.employee-card[data-id="${empId}"] .employee-row`);
    const det  = document.getElementById(`details-${empId}`);
    const isShow = det.classList.contains('show');
    
    // Close others
    document.querySelectorAll('.employee-details.show').forEach(el => {
        if (el.id !== `details-${empId}`) {
            el.classList.remove('show');
            el.previousElementSibling.classList.remove('active');
        }
    });

    det.classList.toggle('show');
    row.classList.toggle('active');

    if (!isShow) {
        currentEmpId = empId;
        await loadAttendance(empId);
    } else {
        if (currentEmpId === empId) currentEmpId = '';
    }
}

async function loadAttendance(empId) {
    if (!empId) return;
    const isEmp = user.role === 'employee';
    const tbody = isEmp ? document.getElementById('empAttendanceTableBody') : document.getElementById(`tbody-${empId}`);
    if (!tbody) return;

    try {
        const logs = await API.get(`/api/attendance?employee_id=${empId}`);
        currentLogs = logs; // Sync with global for calendar click interactions
        
        // Update stats for this month
        const now = new Date();
        const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        let stats = { Present:0, Absent:0, Late:0, 'On Leave':0 };
        const curMonthLogs = logs.filter(a => a.attendance_date.startsWith(curMonth));
        
        curMonthLogs.forEach(a => {
            const s = a.status || 'Present';
            if (stats[s] !== undefined) stats[s]++;
        });
        
        // ALWAYS update global stats counters (beside calendar)
        document.getElementById('countPresent').innerText = stats.Present;
        document.getElementById('countAbsent').innerText  = stats.Absent;
        document.getElementById('countLate').innerText    = stats.Late;
        document.getElementById('countLeave').innerText   = stats['On Leave'];

        // If admin view, also update the small stats inside the accordion row
        if (!isEmp) {
            document.getElementById(`pres-${empId}`).innerText  = stats.Present;
            document.getElementById(`abs-${empId}`).innerText   = stats.Absent;
            document.getElementById(`late-${empId}`).innerText  = stats.Late;
            document.getElementById(`leave-${empId}`).innerText = stats['On Leave'];
        }

        // Update Monthly Records Preview (beside calendar)
        const previewEl = document.getElementById('monthlyRecordsPreview');
        if (curMonthLogs.length === 0) {
            previewEl.innerHTML = 'No records for this month.';
        } else {
            previewEl.innerHTML = curMonthLogs.slice(0, 5).map(a => `
                <div class="d-flex justify-content-between mb-1 border-bottom border-secondary pb-1">
                    <span>${a.attendance_date}</span>
                    <span class="text-white fw-bold">${a.status || 'Present'}</span>
                </div>
            `).join('') + (curMonthLogs.length > 5 ? '<div class="mt-1 text-center small text-white-50">See more below</div>' : '');
        }

        // Update Calendar
        if (calendar) {
            const events = logs.map(a => ({
                start: a.attendance_date,
                allDay: true,
                extendedProps: { status: a.status || 'Present' }
            }));
            calendar.setOption('events', events);
        }

        // Update Today's Status (Side panel)
        const todayStr = now.toISOString().split('T')[0];
        const todayLog = logs.find(a => a.attendance_date === todayStr);
        const displayStatusText = document.getElementById('displayStatusText');
        const statusSelect      = document.getElementById('statusSelect');
        const statusInfo        = document.getElementById('statusInfo');
        const clockBadge        = document.getElementById('todayStatusBadge');
        const clockInfo         = document.getElementById('timeRecordedInfo');

        const currentStatus = todayLog ? (todayLog.status || 'Present') : 'Not Marked';
        if (displayStatusText) displayStatusText.innerText = currentStatus;
        if (statusSelect) statusSelect.value = todayLog ? (todayLog.status || 'Present') : '';
        if (statusInfo) statusInfo.innerText = todayLog ? `Current Status: ${currentStatus}` : "Not yet marked for today";

        if (isEmp && clockBadge) {
            // Hide administrative marking options for employees
            const optAbs = document.getElementById('optionAbsent');
            const optLeave = document.getElementById('optionLeave');
            if (optAbs) optAbs.style.display = 'none';
            if (optLeave) optLeave.style.display = 'none';

            if (!todayLog) {
                clockBadge.className = 'status-badge status-none';
                clockBadge.innerHTML = '<i class="bi bi-circle-fill"></i> Not Checked In';
                clockInfo.innerHTML  = '';
            } else {
                const isIn = todayLog.time_in && !todayLog.time_out;
                clockBadge.className = isIn ? 'status-badge status-in' : 'status-badge status-out';
                clockBadge.innerHTML = isIn ? '<i class="bi bi-circle-fill"></i> CHECKED IN' : '<i class="bi bi-check-circle-fill"></i> CLOCKED OUT';
            }
        }

        if (!logs.length) {
            tbody.innerHTML = `<tr><td colspan="${isEmp ? 4 : 5}" class="text-dim py-4">No records found.</td></tr>`;
            return;
        }

        tbody.innerHTML = logs.map(a => {
            const tin  = formatTime12Hour(a.time_in);
            const tout = formatTime12Hour(a.time_out);
            const dur  = calcDuration(a.time_in, a.time_out);
            
            if (isEmp) {
                return `<tr>
                    <td class="fw-bold">${a.attendance_date}</td>
                    <td><span class="badge bg-success p-2">${tin}</span></td>
                    <td><span class="badge ${a.time_out ? 'bg-danger' : 'bg-secondary'} p-2">${tout}</span></td>
                    <td class="text-dim small">${dur}</td>
                </tr>`;
            } else {
                return `<tr>
                    <td class="fw-bold">${a.attendance_date}</td>
                    <td><span class="badge bg-success p-2">${tin}</span></td>
                    <td><span class="badge ${a.time_out ? 'bg-danger' : 'bg-secondary'} p-2">${tout}</span></td>
                    <td class="text-dim small">${dur}</td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteAttendance(${a.id}, '${empId}')" title="Delete Record">
                            <i class="bi bi-trash-fill"></i>
                        </button>
                    </td>
                </tr>`;
            }
        }).join('');
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-danger py-4">Failed to load.</td></tr>`;
    }
}

async function deleteAttendance(id, empId) {
    if (!confirm('Permanently delete this attendance record?')) return;
    try {
        await API.delete(`/api/attendance/${id}`);
        API.showToast('Record deleted.', 'success');
        loadAttendance(empId || user.employee_id);
    } catch (err) { alert(err.message || 'Error deleting.'); }
}

async function saveTodayStatus() {
    const status = document.getElementById('statusSelect').value;
    if (!status) { alert('Please select a status first.'); return; }
    
    const targetEmpId = (user.role === 'employee') ? user.employee_id : currentEmpId;
    if (!targetEmpId) { alert('No employee selected.'); return; }
    
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    try {
        await API.post('/api/attendance', { employee_id: targetEmpId, attendance_date: dateStr, status: status });
        API.showToast(`Attendance marked as ${status}`, 'success');
        loadAttendance(targetEmpId);
    } catch (err) { alert(err.message || 'Failed to save attendance.'); }
}

document.addEventListener('DOMContentLoaded', () => {
    if (user.role === 'employee') initEmployeePanel();
    else initAdminPanel();
});