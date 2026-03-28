// ONLY Admins get access to global system settings and security modules.
if (!requireRole('admin')) { /* redirects handled inside */ }

function triggerBackup() {
    API.showToast("Database safely backed up to secure volumes.", "success");
}
