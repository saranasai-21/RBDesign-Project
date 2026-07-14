// Main Application State & Router
const App = {
    user: null,
    permissions: [],
    token: localStorage.getItem('loadflow_token'),
    
    async init() {
        if (this.token) {
            try {
                const res = await API.get('/auth/me');
                this.user = res.user;
                this.permissions = res.permissions;
                this.route();
            } catch (err) {
                this.logout();
            }
        } else {
            this.route();
        }
    },

    hasPermission(perm) {
        return this.user?.is_admin || this.permissions.includes(perm);
    },

    route() {
        const appDiv = document.getElementById('app');
        const hash = window.location.hash.substring(1) || '';
        
        if (!this.user && hash !== 'register') {
            appDiv.innerHTML = AuthComponent.renderLogin();
            AuthComponent.attachLoginEvents();
            return;
        }

        if (!this.user && hash === 'register') {
            appDiv.innerHTML = AuthComponent.renderRegister();
            AuthComponent.attachRegisterEvents();
            return;
        }

        // Render layout
        appDiv.innerHTML = this.renderLayout();

        const mainContent = document.getElementById('main-content');
        
        // Routes
        if (hash === 'admin' && (this.hasPermission('staff.manage') || this.user.is_admin)) {
            mainContent.innerHTML = AdminPanelComponent.render();
            AdminPanelComponent.attachEvents();
        } else if (hash.startsWith('load/')) {
            const loadId = hash.split('/')[1];
            mainContent.innerHTML = LoadDetailComponent.render(loadId);
            LoadDetailComponent.attachEvents(loadId);
        } else {
            // Default dashboards based on account type
            if (this.user.account_type === 'broker') {
                mainContent.innerHTML = BrokerDashboardComponent.render();
                BrokerDashboardComponent.attachEvents();
            } else if (this.user.account_type === 'carrier') {
                mainContent.innerHTML = CarrierDashboardComponent.render();
                CarrierDashboardComponent.attachEvents();
            } else if (this.user.account_type === 'shipper') {
                mainContent.innerHTML = ShipperDashboardComponent.render();
                ShipperDashboardComponent.attachEvents();
            }
        }
        
        // Setup logout event
        document.getElementById('logout-btn').addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });
    },

    renderLayout() {
        return `
            <nav class="navbar animate-fade-in-up">
                <a href="#" class="nav-brand"><i class="fa-solid fa-truck-fast fa-bounce" style="--fa-animation-duration: 2s; --fa-bounce-jump-scale-x: 1; --fa-bounce-jump-scale-y: 1;"></i> LoadFlow</a>
                <div class="nav-links">
                    <a href="#" class="${window.location.hash === '' ? 'active' : ''}">Dashboard</a>
                    ${(this.hasPermission('staff.manage') || this.user.is_admin) && (this.user.account_type !== 'shipper') ? `<a href="#admin" class="${window.location.hash === '#admin' ? 'active' : ''}">Settings & Roles</a>` : ''}
                    <div class="user-menu">
                        <div>
                            <div style="font-size: 0.875rem; font-weight: 600;">${this.user.username} ${this.user.is_admin ? '<span class="badge badge-rate_confirmed" style="font-size:0.6rem; padding:2px 4px;">Admin</span>' : ''}</div>
                            <div class="text-muted" style="font-size: 0.75rem;">${this.user.org_name || 'Shipper'}</div>
                        </div>
                        <a href="#" id="logout-btn" class="text-danger" title="Logout"><i class="fa-solid fa-arrow-right-from-bracket fa-beat-fade" style="--fa-animation-duration: 3s;"></i></a>
                    </div>
                </div>
            </nav>
            <main id="main-content" class="container animate-fade-in-up delay-1" style="padding-top: 2rem;">
            </main>
            <div id="modal-container"></div>
        `;
    },

    login(token, user, permissions) {
        this.token = token;
        this.user = user;
        this.permissions = permissions;
        localStorage.setItem('loadflow_token', token);
        window.location.hash = '';
        this.route();
    },

    logout() {
        this.token = null;
        this.user = null;
        this.permissions = [];
        localStorage.removeItem('loadflow_token');
        window.location.hash = '';
        this.route();
    }
};

// API Client
const API = {
    baseUrl: '/api',

    async request(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        if (App.token) {
            headers['Authorization'] = `Bearer ${App.token}`;
        }

        // Handle multipart/form-data (like POD upload)
        if (options.body instanceof FormData) {
            delete headers['Content-Type']; // Let browser set boundary
        } else if (options.body) {
            options.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                ...options,
                headers
            });
            
            const isJson = response.headers.get('content-type')?.includes('application/json');
            const data = isJson ? await response.json() : await response.text();

            if (!response.ok) {
                if (response.status === 401) {
                    App.logout();
                }
                throw new Error(data.error || data.message || 'API request failed');
            }

            return data;
        } catch (err) {
            console.error('API Error:', err);
            throw err;
        }
    },

    get(endpoint) { return this.request(endpoint); },
    post(endpoint, body) { return this.request(endpoint, { method: 'POST', body }); },
    put(endpoint, body) { return this.request(endpoint, { method: 'PUT', body }); },
    delete(endpoint) { return this.request(endpoint, { method: 'DELETE' }); },
    
    // For POD file upload
    postForm(endpoint, formData) { 
        return this.request(endpoint, { method: 'POST', body: formData });
    }
};

// Utils
const Utils = {
    formatDate(dateStr) {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    },
    formatDateTime(dateStr) {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    },
    formatCurrency(amount) {
        if (amount === null || amount === undefined) return 'N/A';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    },
    getStatusBadge(status) {
        const labels = {
            'posted': 'Posted',
            'carrier_assigned': 'Carrier Assigned',
            'rate_confirmed': 'Rate Confirmed',
            'dispatched': 'Dispatched',
            'in_transit': 'In Transit',
            'delivered': 'Delivered',
            'pod_verified': 'POD Verified',
            'closed': 'Closed'
        };
        return `<span class="badge badge-${status}">${labels[status] || status}</span>`;
    }
};

// Initialize App on load and handle hash changes
window.addEventListener('DOMContentLoaded', () => App.init());
window.addEventListener('hashchange', () => App.route());
