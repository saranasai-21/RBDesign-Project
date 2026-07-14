const AdminPanelComponent = {
    render() {
        return `
            <div class="flex justify-between items-center mb-4">
                <h2><i class="fa-solid fa-users-gear"></i> Settings & Roles</h2>
            </div>
            
            <div style="display: flex; gap: 2rem;">
                <!-- Staff Section -->
                <div class="card" style="flex: 2;">
                    <div class="flex justify-between items-center mb-4">
                        <h3>Staff Members</h3>
                        <button class="btn btn-primary btn-sm" id="btn-add-staff"><i class="fa-solid fa-plus"></i> Add Staff</button>
                    </div>
                    <div class="table-container">
                        <table id="staff-table">
                            <thead>
                                <tr>
                                    <th>Username</th>
                                    <th>Email</th>
                                    <th>Roles</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td colspan="5" style="text-align:center;"><span class="loader"></span></td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Roles Section -->
                <div class="card" style="flex: 1;">
                    <div class="flex justify-between items-center mb-4">
                        <h3>Custom Roles</h3>
                        <button class="btn btn-outline btn-sm" id="btn-create-role"><i class="fa-solid fa-plus"></i> New Role</button>
                    </div>
                    <div id="roles-list">
                        <div style="text-align:center;"><span class="loader"></span></div>
                    </div>
                </div>
            </div>
        `;
    },

    async attachEvents() {
        this.loadData();
        
        document.getElementById('btn-add-staff').addEventListener('click', () => this.showAddStaffModal());
        document.getElementById('btn-create-role').addEventListener('click', () => this.showCreateRoleModal());
    },

    async loadData() {
        try {
            const [staffRes, rolesRes] = await Promise.all([
                API.get('/staff'),
                API.get('/roles')
            ]);
            
            this.renderStaff(staffRes.staff, rolesRes.roles);
            this.renderRoles(rolesRes.roles);
            
            // Store roles for use in modals
            this.roles = rolesRes.roles;
        } catch (err) {
            console.error('Failed to load admin data:', err);
        }
    },

    renderStaff(staff, roles) {
        const tbody = document.querySelector('#staff-table tbody');
        if (staff.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-muted">No staff found.</td></tr>';
            return;
        }

        tbody.innerHTML = staff.map(s => `
            <tr>
                <td><strong>${s.username}</strong> ${s.is_admin ? '<span class="badge badge-rate_confirmed ml-1">Admin</span>' : ''}</td>
                <td>${s.email}</td>
                <td>${s.is_admin ? '<em>All Permissions</em>' : (s.roles.length ? s.roles.map(r => `<span class="badge badge-posted">${r.name}</span>`).join(' ') : '<span class="text-muted">None</span>')}</td>
                <td>${s.is_active ? '<span class="text-success">Active</span>' : '<span class="text-danger">Inactive</span>'}</td>
                <td>
                    ${!s.is_admin ? `
                        <button class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="AdminPanelComponent.showEditStaffModal('${s.id}')">Edit</button>
                    ` : ''}
                </td>
            </tr>
        `).join('');
    },

    renderRoles(roles) {
        const list = document.getElementById('roles-list');
        if (roles.length === 0) {
            list.innerHTML = '<p class="text-muted">No custom roles created yet.</p>';
            return;
        }

        list.innerHTML = roles.map(r => `
            <div style="padding: 1rem; border: 1px solid var(--border); border-radius: var(--radius); margin-bottom: 1rem;">
                <div class="flex justify-between items-center mb-2">
                    <strong>${r.name}</strong>
                    <button class="btn btn-outline" style="padding: 0.15rem 0.4rem; font-size: 0.7rem;" onclick="AdminPanelComponent.showEditRoleModal('${r.id}')">Edit</button>
                </div>
                <p style="font-size: 0.8rem; margin-bottom: 0.5rem;">${r.description || ''}</p>
                <div style="display:flex; flex-wrap:wrap; gap:0.25rem;">
                    ${r.permissions.map(p => `<span class="badge" style="background:rgba(255,255,255,0.1); font-size:0.65rem;">${p}</span>`).join('')}
                </div>
            </div>
        `).join('');
    },

    async showAddStaffModal() {
        const rolesOptions = this.roles.map(r => `
            <label style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem; font-weight:normal; cursor:pointer;">
                <input type="checkbox" name="staff_roles" value="${r.id}"> ${r.name}
            </label>
        `).join('');

        const formHtml = `
            <form id="form-add-staff">
                <div class="form-group">
                    <label>Username</label>
                    <input type="text" id="as-username" class="form-control" required>
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="as-email" class="form-control" required>
                </div>
                <div class="form-group">
                    <label>Temporary Password</label>
                    <input type="password" id="as-password" class="form-control" required>
                </div>
                <div class="form-group mt-4">
                    <label>Assign Roles</label>
                    <div style="background:rgba(0,0,0,0.2); padding:1rem; border-radius:var(--radius); max-height:150px; overflow-y:auto;">
                        ${rolesOptions || '<span class="text-muted">No roles available. Create one first.</span>'}
                    </div>
                </div>
            </form>
        `;

        Modals.show('Add Staff Member', formHtml, async () => {
            const role_ids = Array.from(document.querySelectorAll('input[name="staff_roles"]:checked')).map(cb => cb.value);
            
            await API.post('/staff', {
                username: document.getElementById('as-username').value,
                email: document.getElementById('as-email').value,
                password: document.getElementById('as-password').value,
                role_ids
            });
            
            this.loadData();
        }, 'Create Staff');
    },

    async showCreateRoleModal() {
        try {
            const { permissions } = await API.get('/roles/permissions');
            
            const permOptions = permissions.map(p => `
                <label style="display:flex; align-items:flex-start; gap:0.5rem; margin-bottom:0.75rem; font-weight:normal; cursor:pointer;">
                    <input type="checkbox" name="role_perms" value="${p.key}" style="margin-top:0.25rem;"> 
                    <div>
                        <div style="font-weight:600; font-size:0.85rem; color:var(--text-main);">${p.key}</div>
                        <div style="font-size:0.75rem; color:var(--text-muted);">${p.description}</div>
                    </div>
                </label>
            `).join('');

            const formHtml = `
                <form id="form-create-role">
                    <div class="form-group">
                        <label>Role Name</label>
                        <input type="text" id="cr-name" class="form-control" required placeholder="e.g. Dispatcher">
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <input type="text" id="cr-desc" class="form-control" placeholder="Brief description...">
                    </div>
                    <div class="form-group mt-4">
                        <label>Select Permissions (Permission Catalog)</label>
                        <div style="background:rgba(0,0,0,0.2); padding:1rem; border-radius:var(--radius); max-height:300px; overflow-y:auto;">
                            ${permOptions}
                        </div>
                    </div>
                </form>
            `;

            Modals.show('Build Custom Role', formHtml, async () => {
                const selectedPerms = Array.from(document.querySelectorAll('input[name="role_perms"]:checked')).map(cb => cb.value);
                
                if (selectedPerms.length === 0) {
                    throw new Error('Please select at least one permission');
                }

                await API.post('/roles', {
                    name: document.getElementById('cr-name').value,
                    description: document.getElementById('cr-desc').value,
                    permissions: selectedPerms
                });
                
                this.loadData();
            }, 'Save Role');
        } catch (err) {
            alert('Failed to load permissions: ' + err.message);
        }
    },

    // Optional: showEditStaffModal and showEditRoleModal implementation...
    showEditStaffModal(staffId) {
        alert("Edit staff functionality to be implemented in full version");
    },
    showEditRoleModal(roleId) {
        alert("Edit role functionality to be implemented in full version");
    }
};
