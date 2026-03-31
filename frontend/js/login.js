let selectedRole = 'admin';

function selectRole(role) {
    selectedRole = role;
    document.querySelectorAll('.role-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.role === role);
    });
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}

async function handleLogin() {
    const errorMsg = document.getElementById('errorMsg');
    const btn      = document.getElementById('loginBtn');
    
    errorMsg.textContent = '';
    btn.disabled = true;
    btn.innerHTML = 'Signing in...';

    try {
        await authLogin(
            document.getElementById('username').value.trim(), 
            document.getElementById('password').value.trim(),
            selectedRole
        );
        window.location.href = 'dashboard.html';
    } catch (err) {
        errorMsg.textContent = err.message;
        btn.disabled = false;
        btn.innerHTML = 'Sign In';
    }
}
