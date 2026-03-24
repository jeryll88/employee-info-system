/**
 * attendance.js
 * Handles attendance fetching and logging using API utility.
 */

async function clockIn(empId) {
    try {
        await API.post('/api/attendance', { employee_id: empId, type: 'in' });
        API.showToast("Clocked in successfully!");
        API.logActivity(`Clocked in: Employee ID ${empId}`);
    } catch (err) { /* API utility handles toast */ }
}

async function clockOut(empId) {
    try {
        await API.post('/api/attendance', { employee_id: empId, type: 'out' });
        API.showToast("Clocked out successfully!");
        API.logActivity(`Clocked out: Employee ID ${empId}`);
    } catch (err) { /* API utility handles toast */ }
}