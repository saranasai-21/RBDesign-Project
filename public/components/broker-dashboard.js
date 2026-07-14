const BrokerDashboardComponent = {
    render() {
        return `
            <div class="flex justify-between items-center mb-4 animate-fade-in-up">
                <h2><i class="fa-solid fa-chart-line fa-beat" style="--fa-animation-duration: 2s;"></i> Broker Operations</h2>
                ${App.hasPermission('load.create') ? `<button class="btn btn-primary" id="btn-create-load"><i class="fa-solid fa-plus fa-fade"></i> Post Load</button>` : ''}
            </div>
            
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 2rem; margin-bottom: 2rem;" class="animate-fade-in-up delay-1">
                <div>
                    <h3 class="mb-2">Load Overview</h3>
                    <div class="stats-grid" id="broker-stats" style="margin-bottom:0;">
                        <!-- Stats loaded here -->
                    </div>
                </div>
                <div class="card flex items-center justify-center" style="min-height: 250px;">
                    <canvas id="brokerLoadChart"></canvas>
                </div>
            </div>

            <div class="card mb-4 animate-fade-in-up delay-2" id="compliance-alerts" style="display:none; border-color: var(--warning);">
                <h3 class="text-warning mb-2"><i class="fa-solid fa-triangle-exclamation"></i> Carrier Compliance Alerts</h3>
                <div id="compliance-alerts-list"></div>
            </div>

            <div class="card animate-fade-in-up delay-3">
                <div class="flex justify-between items-center mb-4">
                    <h3>Load Board</h3>
                    <div style="display: flex; gap: 0.5rem;">
                        <input type="text" id="search-loads" class="form-control" placeholder="Search reference, origin..." style="width: 250px;">
                        <select id="filter-status" class="form-control" style="width: 150px;">
                            <option value="">All Statuses</option>
                            <option value="posted">Posted</option>
                            <option value="carrier_assigned">Carrier Assigned</option>
                            <option value="rate_confirmed">Rate Confirmed</option>
                            <option value="in_transit">In Transit</option>
                        </select>
                    </div>
                </div>
                
                <div class="table-container">
                    <table id="loads-table">
                        <thead>
                            <tr>
                                <th>Ref #</th>
                                <th>Origin &rarr; Destination</th>
                                <th>Carrier</th>
                                <th>Pickup Date</th>
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

        if (App.hasPermission('load.create')) {
            document.getElementById('btn-create-load').addEventListener('click', () => {
                this.showCreateLoadModal();
            });
        }

        document.getElementById('search-loads').addEventListener('keyup', (e) => {
            if (e.key === 'Enter') this.loadLoads();
        });
        document.getElementById('filter-status').addEventListener('change', () => this.loadLoads());
    },

    async loadData() {
        this.loadStats();
        this.loadComplianceAlerts();
        this.loadLoads();
    },

    async loadStats() {
        try {
            const { stats } = await API.get('/loads/stats/summary');
            document.getElementById('broker-stats').innerHTML = `
                <div class="card stat-card hoverable">
                    <div class="stat-value">${stats.posted}</div>
                    <div class="stat-label">Active Posts</div>
                </div>
                <div class="card stat-card hoverable">
                    <div class="stat-value">${stats.carrier_assigned + stats.rate_confirmed}</div>
                    <div class="stat-label">Pending Dispatch</div>
                </div>
                <div class="card stat-card hoverable">
                    <div class="stat-value">${stats.in_transit + stats.dispatched}</div>
                    <div class="stat-label">In Transit</div>
                </div>
                <div class="card stat-card hoverable" style="${stats.compliance_flagged > 0 ? 'border-color: var(--danger);' : ''}">
                    <div class="stat-value ${stats.compliance_flagged > 0 ? 'text-danger' : ''}">${stats.compliance_flagged}</div>
                    <div class="stat-label">Compliance Flags</div>
                </div>
            `;
            
            // Render Chart.js
            const ctx = document.getElementById('brokerLoadChart');
            if (ctx && window.Chart) {
                // Destroy old instance if exists (due to re-render)
                if (this.chartInstance) this.chartInstance.destroy();
                
                this.chartInstance = new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Posted', 'Pending', 'In Transit', 'Delivered'],
                        datasets: [{
                            data: [
                                stats.posted, 
                                stats.carrier_assigned + stats.rate_confirmed, 
                                stats.in_transit + stats.dispatched, 
                                stats.delivered + stats.pod_verified + stats.closed
                            ],
                            backgroundColor: [
                                '#64748b', // muted
                                '#f59e0b', // warning
                                '#3b82f6', // primary
                                '#10b981'  // success
                            ],
                            borderWidth: 0,
                            hoverOffset: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { position: 'right', labels: { font: { family: "'Plus Jakarta Sans', sans-serif" } } }
                        },
                        cutout: '75%'
                    }
                });
            }
        } catch (err) {
            console.error('Failed to load stats', err);
        }
    },

    async loadComplianceAlerts() {
        try {
            const { carriers } = await API.get('/compliance/list/all');
            const alerts = carriers.filter(c => !c.compliant);
            
            const container = document.getElementById('compliance-alerts');
            const list = document.getElementById('compliance-alerts-list');
            
            if (alerts.length > 0) {
                container.style.display = 'block';
                list.innerHTML = alerts.map(c => `
                    <div style="padding: 0.5rem; background: rgba(0,0,0,0.2); margin-bottom: 0.5rem; border-radius: var(--radius); display:flex; justify-content:space-between;">
                        <span><strong>${c.name}</strong> (MC: ${c.mc_number || 'N/A'})</span>
                        <span class="text-danger">${c.alerts.map(a => a.message).join(' | ')}</span>
                    </div>
                `).join('');
            } else {
                container.style.display = 'none';
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
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;" class="text-muted">No loads found.</td></tr>';
                return;
            }

            tbody.innerHTML = loads.map(load => `
                <tr>
                    <td><strong>${load.reference_number}</strong>
                        ${load.compliance_flagged ? '<br><span class="badge badge-posted" style="background:var(--danger); color:white; font-size:0.65rem;">Flagged</span>' : ''}
                    </td>
                    <td>${load.origin} <i class="fa-solid fa-arrow-right text-muted mx-1"></i> ${load.destination}</td>
                    <td>${load.carrier_name || '<span class="text-muted">Unassigned</span>'}</td>
                    <td>${Utils.formatDate(load.pickup_date)}</td>
                    <td>${Utils.getStatusBadge(load.status)}</td>
                    <td>
                        <a href="#load/${load.id}" class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">View</a>
                    </td>
                </tr>
            `).join('');
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-danger">Error loading data: ${err.message}</td></tr>`;
        }
    },

    async showCreateLoadModal() {
        try {
            const { shippers } = await API.get('/loads/stats/summary');
            
            let shipperOptions = shippers.map(s => `<option value="${s.id}">${s.username} (${s.email})</option>`).join('');
            
            const formHtml = `
                <form id="form-create-load">
                    <div class="form-group">
                        <label>Shipper</label>
                        <select id="cl-shipper" class="form-control" required>
                            <option value="">Select Shipper...</option>
                            ${shipperOptions}
                        </select>
                    </div>
                    <div style="display:flex; gap:1rem;">
                        <div class="form-group" style="flex:1;">
                            <label>Origin</label>
                            <input type="text" id="cl-origin" class="form-control" required placeholder="City, State">
                        </div>
                        <div class="form-group" style="flex:1;">
                            <label>Destination</label>
                            <input type="text" id="cl-dest" class="form-control" required placeholder="City, State">
                        </div>
                    </div>
                    <div style="display:flex; gap:1rem;">
                        <div class="form-group" style="flex:1;">
                            <label>Pickup Date</label>
                            <input type="date" id="cl-pickup" class="form-control" required>
                        </div>
                        <div class="form-group" style="flex:1;">
                            <label>Delivery Date</label>
                            <input type="date" id="cl-delivery" class="form-control" required>
                        </div>
                    </div>
                    <div style="display:flex; gap:1rem;">
                        <div class="form-group" style="flex:1;">
                            <label>Equipment Type</label>
                            <select id="cl-equipment" class="form-control">
                                <option value="Van">Dry Van</option>
                                <option value="Reefer">Reefer</option>
                                <option value="Flatbed">Flatbed</option>
                            </select>
                        </div>
                        <div class="form-group" style="flex:1;">
                            <label>Commodity</label>
                            <input type="text" id="cl-commodity" class="form-control">
                        </div>
                        <div class="form-group" style="flex:1;">
                            <label>Weight (lbs)</label>
                            <input type="number" id="cl-weight" class="form-control">
                        </div>
                    </div>
                </form>
            `;

            Modals.show('Create New Load', formHtml, async () => {
                const payload = {
                    shipper_id: document.getElementById('cl-shipper').value,
                    origin: document.getElementById('cl-origin').value,
                    destination: document.getElementById('cl-dest').value,
                    pickup_date: document.getElementById('cl-pickup').value,
                    delivery_date: document.getElementById('cl-delivery').value,
                    equipment_type: document.getElementById('cl-equipment').value,
                    commodity: document.getElementById('cl-commodity').value,
                    weight: document.getElementById('cl-weight').value || null
                };

                await API.post('/loads', payload);
                this.loadData();
            }, 'Post Load');
        } catch (err) {
            alert('Failed to load form data: ' + err.message);
        }
    }
};
