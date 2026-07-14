const ShipperDashboardComponent = {
    render() {
        return `
            <div class="flex justify-between items-center mb-4">
                <h2><i class="fa-solid fa-box"></i> My Shipments</h2>
            </div>
            
            <div class="stats-grid" id="shipper-stats">
                <!-- Stats loaded here -->
            </div>

            <div class="card">
                <div class="flex justify-between items-center mb-4">
                    <h3>Shipment Tracking</h3>
                    <div style="display: flex; gap: 0.5rem;">
                        <input type="text" id="search-loads" class="form-control" placeholder="Search reference..." style="width: 250px;">
                        <select id="filter-status" class="form-control" style="width: 150px;">
                            <option value="">All Statuses</option>
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

        document.getElementById('search-loads').addEventListener('keyup', (e) => {
            if (e.key === 'Enter') this.loadLoads();
        });
        document.getElementById('filter-status').addEventListener('change', () => this.loadLoads());
    },

    async loadData() {
        this.loadStats();
        this.loadLoads();
    },

    async loadStats() {
        try {
            const { stats } = await API.get('/loads/stats/summary');
            document.getElementById('shipper-stats').innerHTML = `
                <div class="card stat-card hoverable">
                    <div class="stat-value">${stats.total - stats.delivered - stats.pod_verified - stats.closed}</div>
                    <div class="stat-label">Active Shipments</div>
                </div>
                <div class="card stat-card hoverable">
                    <div class="stat-value text-success">${stats.delivered + stats.pod_verified + stats.closed}</div>
                    <div class="stat-label">Completed</div>
                </div>
            `;
        } catch (err) {
            console.error('Failed to load stats', err);
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
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;" class="text-muted">No shipments found.</td></tr>';
                return;
            }

            tbody.innerHTML = loads.map(load => `
                <tr>
                    <td><strong>${load.reference_number}</strong></td>
                    <td>${load.broker_name || 'N/A'}</td>
                    <td>${load.origin} <i class="fa-solid fa-arrow-right text-muted mx-1"></i> ${load.destination}</td>
                    <td><div style="font-size:0.8rem">P: ${Utils.formatDate(load.pickup_date)}<br>D: ${Utils.formatDate(load.delivery_date)}</div></td>
                    <td>${Utils.getStatusBadge(load.status)}</td>
                    <td>
                        <a href="#load/${load.id}" class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">Track</a>
                    </td>
                </tr>
            `).join('');
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-danger">Error loading data: ${err.message}</td></tr>`;
        }
    }
};
