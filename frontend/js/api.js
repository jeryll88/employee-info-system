/**
 * api.js
 * Centralized API utility for Employee Information System.
 */

const API_BASE = ''; // Uses relative execution relative to browser URL

const API = {
    /**
     * Enhanced fetch wrapper
     */
    async request(endpoint, options = {}) {
        const url = API_BASE + endpoint;
        
        const defaultOptions = {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        };
        
        const mergedOptions = { ...defaultOptions, ...options };
        if (options.body && typeof options.body === 'object') {
            mergedOptions.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(url, mergedOptions);
            const data = await response.json().catch(() => ({ error: 'Invalid server response' }));

            if (!response.ok) {
                const errorMsg = data.error || data.message || `Request failed (${response.status})`;
                this.showToast(errorMsg, 'danger');
                if (response.status === 401) {
                    // Session expired or not logged in
                    window.location.href = 'login.html';
                }
                throw new Error(errorMsg);
            }
            return data;
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            throw error;
        }
    },

    get(url) { return this.request(url, { method: 'GET' }); },
    post(url, body) { return this.request(url, { method: 'POST', body }); },
    put(url, body) { return this.request(url, { method: 'PUT', body }); },
    delete(url) { return this.request(url, { method: 'DELETE' }); },

    /**
     * Activity Logging (to DB)
     */
    async logActivity(activity) {
        try {
            await this.post('/api/activities', { activity });
        } catch (e) { /* silent fail for logging */ }
    },

    /**
     * UI: Toast Notifications
     */
    showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            const container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            document.body.appendChild(container);
        }

        const toastId = 'toast-' + Date.now();
        const toastHtml = `
            <div id="${toastId}" class="toast align-items-center text-white bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                    <div class="toast-body">${message}</div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            </div>
        `;

        document.getElementById('toast-container').insertAdjacentHTML('beforeend', toastHtml);
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
        toast.show();
        
        toastElement.addEventListener('hidden.bs.toast', () => toastElement.remove());
    }
};
