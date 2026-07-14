const AuthComponent = {
    renderLogin() {
        return `
            <div class="auth-container">
                <div class="card auth-card">
                    <div style="text-align: center; margin-bottom: 2rem;">
                        <h1 style="font-size: 2rem; margin-bottom: 0.5rem;"><i class="fa-solid fa-truck-fast"></i> LoadFlow</h1>
                        <p>Sign in to your account</p>
                    </div>
                    
                    <div id="login-error" class="alert alert-danger" style="display: none;"></div>

                    <form id="login-form">
                        <div class="form-group">
                            <label>Username</label>
                            <input type="text" id="username" class="form-control" required autocomplete="username">
                        </div>
                        <div class="form-group">
                            <label>Password</label>
                            <input type="password" id="password" class="form-control" required autocomplete="current-password">
                        </div>
                        <button type="submit" class="btn btn-primary w-full" id="login-btn" style="padding: 0.75rem; font-size: 1rem; margin-top: 1rem;">
                            Sign In
                        </button>
                    </form>
                    
                    <div style="text-align: center; margin-top: 1.5rem; font-size: 0.875rem;">
                        <p>Don't have an account? <a href="#register" class="text-primary" style="text-decoration:none;">Register Organization</a></p>
                    </div>
                    
                    <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid var(--border); font-size: 0.75rem; color: var(--text-muted);">
                        <p style="margin-bottom: 0.25rem;"><strong>Demo Accounts (pw: password123)</strong></p>
                        <p style="margin-bottom: 0;">Broker: brokeradmin / dispatcher1</p>
                        <p style="margin-bottom: 0;">Carrier: carrieradmin / driver1</p>
                        <p style="margin-bottom: 0;">Shipper: shipperuser</p>
                    </div>
                </div>
            </div>
        `;
    },

    renderRegister() {
        return `
            <div class="auth-container">
                <div class="card auth-card">
                    <div style="text-align: center; margin-bottom: 2rem;">
                        <h2 style="margin-bottom: 0.5rem;"><i class="fa-solid fa-building"></i> Register Organization</h2>
                        <p>Create a new broker, carrier, or shipper account</p>
                    </div>
                    
                    <div id="register-error" class="alert alert-danger" style="display: none;"></div>

                    <form id="register-form">
                        <div class="form-group">
                            <label>Account Type</label>
                            <select id="reg-type" class="form-control" required>
                                <option value="broker">Freight Brokerage</option>
                                <option value="carrier">Carrier / Trucking Co.</option>
                                <option value="shipper">Shipper (Individual/Business)</option>
                            </select>
                        </div>
                        <div class="form-group" id="org-name-group">
                            <label>Organization Name</label>
                            <input type="text" id="reg-org" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label>Admin Username</label>
                            <input type="text" id="reg-username" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label>Admin Email</label>
                            <input type="email" id="reg-email" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label>Password</label>
                            <input type="password" id="reg-password" class="form-control" required>
                        </div>
                        <button type="submit" class="btn btn-success w-full" id="register-btn" style="padding: 0.75rem; font-size: 1rem; margin-top: 1rem;">
                            Register
                        </button>
                    </form>
                    
                    <div style="text-align: center; margin-top: 1.5rem; font-size: 0.875rem;">
                        <p>Already have an account? <a href="#" class="text-primary" style="text-decoration:none;">Sign In</a></p>
                    </div>
                </div>
            </div>
        `;
    },

    attachLoginEvents() {
        const form = document.getElementById('login-form');
        const errorDiv = document.getElementById('login-error');
        const btn = document.getElementById('login-btn');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorDiv.style.display = 'none';
            btn.innerHTML = '<span class="loader"></span>';
            btn.disabled = true;

            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            try {
                const res = await API.post('/auth/login', { username, password });
                App.login(res.token, res.user, res.permissions);
            } catch (err) {
                errorDiv.textContent = err.message || 'Login failed';
                errorDiv.style.display = 'block';
                btn.innerHTML = 'Sign In';
                btn.disabled = false;
            }
        });
    },

    attachRegisterEvents() {
        const form = document.getElementById('register-form');
        const typeSelect = document.getElementById('reg-type');
        const orgGroup = document.getElementById('org-name-group');
        const orgInput = document.getElementById('reg-org');
        const errorDiv = document.getElementById('register-error');
        const btn = document.getElementById('register-btn');

        typeSelect.addEventListener('change', (e) => {
            if (e.target.value === 'shipper') {
                orgGroup.style.display = 'none';
                orgInput.required = false;
            } else {
                orgGroup.style.display = 'block';
                orgInput.required = true;
            }
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorDiv.style.display = 'none';
            btn.innerHTML = '<span class="loader"></span>';
            btn.disabled = true;

            const payload = {
                account_type: typeSelect.value,
                username: document.getElementById('reg-username').value,
                email: document.getElementById('reg-email').value,
                password: document.getElementById('reg-password').value,
                org_name: orgInput.value
            };

            try {
                const res = await API.post('/auth/register', payload);
                App.login(res.token, res.user, []); // new orgs have no custom roles yet, admin has all implicitly
            } catch (err) {
                errorDiv.textContent = err.message || 'Registration failed';
                errorDiv.style.display = 'block';
                btn.innerHTML = 'Register';
                btn.disabled = false;
            }
        });
    }
};
