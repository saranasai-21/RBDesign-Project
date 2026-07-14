const CarrierDashboardComponent = {
    render() {
        return `
            <div class="flex justify-between items-center mb-4 animate-fade-in-up">
                <h2><i class="fa-solid fa-truck fa-bounce" style="--fa-animation-duration: 2.5s; --fa-bounce-jump-scale-x: 1; --fa-bounce-jump-scale-y: 1;"></i> Carrier Operations</h2>
                ${App.hasPermission('compliance.manage') ? `<button class="btn btn-outline" id="btn-update-compliance"><i class="fa-solid fa-file-contract fa-shake" style="--fa-animation-duration: 3s;"></i> Compliance Info</button>` : ''}
            </div>
            
            <div id="carrier-alerts" class="animate-fade-in-up delay-1"></div>

            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 2rem; margin-bottom: 2rem;" class="animate-fade-in-up delay-2">
                <div>
                    <h3 class="mb-2">Load Overview</h3>
                    <div class="stats-grid" id="carrier-stats" style="margin-bottom:0;">
                        <!-- Stats loaded here -->
                    </div>
                </div>
                <div class="card flex items-center justify-center" style="min-height: 250px;">
                    <canvas id="carrierLoadChart"></canvas>
                </div>
            </div>

            <div class="card animate-fade-in-up delay-3">
                <div class="flex justify-between items-center mb-4">
                    <h3>Assigned Loads</h3>
                    <div style="display: flex; gap: 0.5rem;">
                        <input type="text" id="search-loads" class="form-control" placeholder="Search reference..." style="width: 250px;">
                        <select id="filter-status" class="form-control" style="width: 150px;">
                            <option value="">All Statuses</option>
                            <option value="carrier_assigned">Needs Action</option>
                            <option value="in_transit">In Transit</option>
                            <option value="delivered">Delivered</option>
                        </select>
                    </div>
                </div>
                
                <div class="table-container">
                    <table id="loads-table">
                        <thead>
                            <tr>
                                <th>Ref #</th>
                                <th>Broker</th>
                                <th>Route</th>
                                <th>Dates</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td colspan="6" style="text-align:center;"><span class="loader"></span> Loading...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    async attachEvents() {
        this.loadData();

        if (App.hasPermission('compliance.manage')) {
            document.getElementById('btn-update-compliance').addEventListener('click', () => {
                this.showComplianceModal();
            });
        }

        document.getElementById('search-loads').addEventListener('keyup', (e) => {
            if (e.key === 'Enter') this.loadLoads();
        });
        document.getElementById('filter-status').addEventListener('change', () => this.loadLoads());
    },

    async loadData() {
        this.loadStats();
        this.loadCompliance();
        this.loadLoads();
    },

    async loadStats() {
        try {
            const { stats } = await API.get('/loads/stats/summary');
            document.getElementById('carrier-stats').innerHTML = `
                <div class="card stat-card hoverable">
                    <div class="stat-value">${stats.carrier_assigned}</div>
                    <div class="stat-label">Pending Action</div>
                </div>
                <div class="card stat-card hoverable">
                    <div class="stat-value">${stats.in_transit}</div>
                    <div class="stat-label">In Transit</div>
                </div>
                <div class="card stat-card hoverable">
                    <div class="stat-value text-success">${stats.delivered + stats.pod_verified}</div>
                    <div class="stat-label">Delivered</div>
                </div>
            `;
            
            // Render Chart.js
            const ctx = document.getElementById('carrierLoadChart');
            if (ctx && window.Chart) {
                if (this.chartInstance) this.chartInstance.destroy();
                
                this.chartInstance = new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Pending', 'In Transit', 'Completed'],
                        datasets: [{
                            data: [
                                stats.carrier_assigned, 
                                stats.in_transit, 
                                stats.delivered + stats.pod_verified + stats.closed
                            ],
                            backgroundColor: ['#f59e0b', '#3b82f6', '#10b981'],
                            borderWidth: 0,
                            hoverOffset: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { position: 'bottom', labels: { font: { family: "'Plus Jakarta Sans', sans-serif" } } } },
                        cutout: '75%'
                    }
                });
            }
        } catch (err) {
            console.error('Failed to load stats', err);
        }
    },

    async loadCompliance() {
        try {
            const res = await API.get('/compliance');
            const alertsDiv = document.getElementById('carrier-alerts');
            
            if (res.alerts && res.alerts.length > 0) {
                alertsDiv.innerHTML = res.alerts.map(a => `
                    <div class="alert alert-${a.type}">
                        <i class="fa-solid fa-circle-exclamation"></i> <strong>Compliance Alert:</strong> ${a.message}
                        ${App.hasPermission('compliance.manage') ? `<a href="#" onclick="document.getElementById('btn-update-compliance').click(); return false;" style="margin-left:1rem; color:inherit; text-decoration:underline;">Update now</a>` : ''}
                    </div>
                `).join('');
            } else if (!res.compliance && App.hasPermission('compliance.manage')) {
                alertsDiv.innerHTML = `
                    <div class="alert alert-warning">
                        <i class="fa-solid fa-circle-exclamation"></i> <strong>Action Required:</strong> Please complete your compliance profile to receive loads.
                        <button class="btn btn-outline" style="margin-left:1rem; padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="document.getElementById('btn-update-compliance').click()">Update Profile</button>
                    </div>
                `;
            } else {
                alertsDiv.innerHTML = '';
            }
        } catch (err) {
            console.error('Failed to load compliance', err);
        }
    },

    async loadLoads() {
        const search = document.getElementById('search-loads').value;
        const status = document.getElementById('filter-status').value;
        const tbody = document.querySelector('#loads-table tbody');
        
        try {
            let url = '/loads?';
            if (search) url += `search=${encodeURIComponent(search)}&`;
            if (status) url += `status=${status}&`;

            const { loads } = await API.get(url);
            
            if (loads.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;" class="text-muted">No assigned loads found.</td></tr>';
                return;
            }

            tbody.innerHTML = loads.map(load => `
                <tr>
                    <td><strong>${load.reference_number}</strong></td>
                    <td>${load.broker_name || 'Unknown Broker'}</td>
                    <td>${load.origin} <i class="fa-solid fa-arrow-right text-muted mx-1"></i> ${load.destination}</td>
                    <td><div style="font-size:0.8rem">P: ${Utils.formatDate(load.pickup_date)}<br>D: ${Utils.formatDate(load.delivery_date)}</div></td>
                    <td>${Utils.getStatusBadge(load.status)}</td>
                    <td>
                        <a href="#load/${load.id}" class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">Manage Load</a>
                    </td>
                </tr>
            `).join('');
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-danger">Error loading data: ${err.message}</td></tr>`;
        }
    },

    async showComplianceModal() {
        try {
            const res = await API.get('/compliance');
            const comp = res.compliance || { approved_equipment: [], approved_commodities: [] };
            
            const formHtml = `
                <form id="form-compliance">
                    <div style="display:flex; gap:1rem;">
                        <div class="form-group" style="flex:1;">
                            <label>MC Number</label>
                            <input type="text" id="comp-mc" class="form-control" value="${comp.mc_number || ''}">
                        </div>
                        <div class="form-group" style="flex:1;">
                            <label>DOT Number</label>
                            <input type="text" id="comp-dot" class="form-control" value="${comp.dot_number || ''}">
                        </div>
                    </div>
                    <div style="display:flex; gap:1rem;">
                        <div class="form-group" style="flex:1;">
                            <label>Insurance Expiry</label>
                            <input type="date" id="comp-ins" class="form-control" value="${comp.insurance_expiry || ''}" required>
                        </div>
                        <div class="form-group" style="flex:1;">
                            <label>Authority Status</label>
                            <select id="comp-auth" class="form-control">
                                <option value="active" ${comp.authority_status === 'active' ? 'selected' : ''}>Active</option>
                                <option value="suspended" ${comp.authority_status === 'suspended' ? 'selected' : ''}>Suspended</option>
                                <option value="revoked" ${comp.authority_status === 'revoked' ? 'selected' : ''}>Revoked</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Approved Equipment (comma separated)</label>
                        <input type="text" id="comp-eq" class="form-control" value="${comp.approved_equipment.join(', ')}">
                    </div>
                    <div class="form-group">
                        <label>Approved Commodities (comma separated)</label>
                        <input type="text" id="comp-com" class="form-control" value="${comp.approved_commodities.join(', ')}">
                    </div>
                </form>
            `;

            Modals.show('Carrier Compliance Profile', formHtml, async () => {
                const eqRaw = document.getElementById('comp-eq').value;
                const comRaw = document.getElementById('comp-com').value;

                const payload = {
                    mc_number: document.getElementById('comp-mc').value || null,
                    dot_number: document.getElementById('comp-dot').value || null,
                    insurance_expiry: document.getElementById('comp-ins').value || null,
                    authority_status: document.getElementById('comp-auth').value,
                    approved_equipment: eqRaw ? eqRaw.split(',').map(s => s.trim()).filter(s=>s) : [],
                    approved_commodities: comRaw ? comRaw.split(',').map(s => s.trim()).filter(s=>s) : []
                };

                await API.put('/compliance', payload);
                this.loadData();
            }, 'Save Profile');
        } catch (err) {
            alert('Failed to load compliance form: ' + err.message);
        }
    }
};
