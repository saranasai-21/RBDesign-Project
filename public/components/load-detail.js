const LoadDetailComponent = {
    render(loadId) {
        return `
            <div class="flex justify-between items-center mb-4">
                <div class="flex items-center gap-4">
                    <a href="#" class="btn btn-outline" style="padding: 0.5rem;"><i class="fa-solid fa-arrow-left"></i></a>
                    <h2 style="margin: 0;">Load Details</h2>
                </div>
                <div id="load-actions" class="flex gap-2">
                    <!-- Actions injected here based on permissions -->
                </div>
            </div>
            
            <div id="load-compliance-banner"></div>

            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 2rem;">
                <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                    
                    <div class="card" id="load-info-card">
                        <div style="text-align:center;"><span class="loader"></span></div>
                    </div>

                    <div class="card" id="load-rates-card">
                        <h3 class="mb-4">Rate Confirmations</h3>
                        <div id="rates-content"><div style="text-align:center;"><span class="loader"></span></div></div>
                    </div>

                </div>

                <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                    
                    <div class="card" id="load-parties-card">
                        <h3 class="mb-4">Parties Involved</h3>
                        <div id="parties-content"><div style="text-align:center;"><span class="loader"></span></div></div>
                    </div>

                    <div class="card" id="load-audit-card">
                        <h3 class="mb-4">Audit Trail</h3>
                        <div id="audit-content" style="max-height: 400px; overflow-y: auto;"><div style="text-align:center;"><span class="loader"></span></div></div>
                    </div>

                </div>
            </div>
        `;
    },

    async attachEvents(loadId) {
        this.loadId = loadId;
        this.loadData();
    },

    async loadData() {
        try {
            const data = await API.get(`/loads/${this.loadId}`);
            this.currentData = data;
            
            this.renderInfo(data.load);
            this.renderParties(data.load, data.shipper, data.compliance);
            this.renderRates(data.rates, data.load);
            this.renderAudit(data.audit);
            this.renderActions(data.load);
            this.renderComplianceBanner(data.load, data.compliance);
            
        } catch (err) {
            document.getElementById('main-content').innerHTML = `
                <div class="alert alert-danger">
                    Failed to load details: ${err.message}
                    <br><a href="#" class="btn btn-outline mt-4">Go Back</a>
                </div>
            `;
        }
    },

    renderInfo(load) {
        const card = document.getElementById('load-info-card');
        card.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div>
                    <div class="text-muted" style="font-size: 0.875rem;">Reference Number</div>
                    <div style="font-size: 1.5rem; font-weight: 700;">${load.reference_number}</div>
                </div>
                <div>${Utils.getStatusBadge(load.status)}</div>
            </div>

            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem; padding: 1.5rem; background: rgba(0,0,0,0.2); border-radius: var(--radius);">
                <div style="flex: 1;">
                    <div class="text-muted" style="font-size: 0.875rem; margin-bottom: 0.25rem;">Origin</div>
                    <div style="font-weight: 600; font-size: 1.1rem;">${load.origin}</div>
                    <div class="text-muted" style="font-size: 0.875rem; margin-top: 0.25rem;"><i class="fa-regular fa-calendar"></i> ${Utils.formatDate(load.pickup_date)}</div>
                </div>
                <div style="padding: 0 1rem; color: var(--text-muted);"><i class="fa-solid fa-arrow-right-long fa-2x"></i></div>
                <div style="flex: 1; text-align: right;">
                    <div class="text-muted" style="font-size: 0.875rem; margin-bottom: 0.25rem;">Destination</div>
                    <div style="font-weight: 600; font-size: 1.1rem;">${load.destination}</div>
                    <div class="text-muted" style="font-size: 0.875rem; margin-top: 0.25rem;"><i class="fa-regular fa-calendar"></i> ${Utils.formatDate(load.delivery_date)}</div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
                <div>
                    <div class="text-muted" style="font-size: 0.75rem; text-transform: uppercase;">Equipment</div>
                    <div style="font-weight: 500;">${load.equipment_type || 'N/A'}</div>
                </div>
                <div>
                    <div class="text-muted" style="font-size: 0.75rem; text-transform: uppercase;">Commodity</div>
                    <div style="font-weight: 500;">${load.commodity || 'N/A'}</div>
                </div>
                <div>
                    <div class="text-muted" style="font-size: 0.75rem; text-transform: uppercase;">Weight</div>
                    <div style="font-weight: 500;">${load.weight ? load.weight.toLocaleString() + ' lbs' : 'N/A'}</div>
                </div>
            </div>

            ${load.special_instructions ? `
                <div style="padding-top: 1.5rem; border-top: 1px solid var(--border);">
                    <div class="text-muted" style="font-size: 0.75rem; text-transform: uppercase; margin-bottom: 0.5rem;">Special Instructions</div>
                    <p style="margin: 0; color: var(--text-main); font-size: 0.9rem;">${load.special_instructions}</p>
                </div>
            ` : ''}
            
            ${load.pod_file_path ? `
                <div style="padding-top: 1.5rem; border-top: 1px solid var(--border); margin-top: 1.5rem;">
                    <div class="text-muted" style="font-size: 0.75rem; text-transform: uppercase; margin-bottom: 0.5rem;">Proof of Delivery</div>
                    <a href="/api/loads/${load.id}/download" class="btn btn-outline" target="_blank"><i class="fa-solid fa-file-pdf"></i> View POD Document</a>
                </div>
            ` : ''}
        `;
    },

    renderParties(load, shipper, compliance) {
        const content = document.getElementById('parties-content');
        
        let html = `
            <div style="margin-bottom: 1.5rem;">
                <div class="text-muted" style="font-size: 0.75rem; text-transform: uppercase; margin-bottom: 0.25rem;">Broker</div>
                <div style="font-weight: 500; font-size: 1.1rem;">${load.broker_name || 'N/A'}</div>
            </div>
        `;

        if (App.user.account_type === 'broker') {
            html += `
                <div style="margin-bottom: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border);">
                    <div class="text-muted" style="font-size: 0.75rem; text-transform: uppercase; margin-bottom: 0.25rem;">Shipper (Customer)</div>
                    <div style="font-weight: 500;">${shipper ? shipper.username : 'Unknown'}</div>
                    ${shipper ? `<div class="text-muted" style="font-size: 0.8rem;">${shipper.email}</div>` : ''}
                </div>
            `;
        }

        html += `
            <div style="padding-top: 1.5rem; border-top: 1px solid var(--border);">
                <div class="text-muted" style="font-size: 0.75rem; text-transform: uppercase; margin-bottom: 0.25rem;">Carrier</div>
                ${load.carrier_name ? `
                    <div style="font-weight: 500; font-size: 1.1rem; margin-bottom: 0.5rem;">${load.carrier_name}</div>
                    ${compliance ? `
                        <div style="font-size: 0.8rem; display: flex; flex-direction: column; gap: 0.25rem;">
                            <div><span class="text-muted">MC:</span> ${compliance.mc_number || 'N/A'}</div>
                            <div><span class="text-muted">Auth:</span> <span class="${compliance.authority_status === 'active' ? 'text-success' : 'text-danger'}">${compliance.authority_status.toUpperCase()}</span></div>
                            <div><span class="text-muted">Ins Expiry:</span> ${Utils.formatDate(compliance.insurance_expiry)}</div>
                        </div>
                    ` : '<div class="text-muted" style="font-size: 0.8rem;">No compliance data</div>'}
                ` : '<div class="text-muted" style="font-style: italic;">Unassigned</div>'}
            </div>
        `;

        content.innerHTML = html;
    },

    renderAudit(audit) {
        const content = document.getElementById('audit-content');
        if (!audit || audit.length === 0) {
            content.innerHTML = '<p class="text-muted">No audit trail available.</p>';
            return;
        }

        content.innerHTML = `
            <div style="position: relative; padding-left: 1rem; border-left: 2px solid var(--border);">
                ${audit.map((entry, index) => `
                    <div style="position: relative; margin-bottom: ${index === audit.length-1 ? '0' : '1.5rem'};">
                        <div style="position: absolute; left: -1.45rem; top: 0.25rem; width: 0.75rem; height: 0.75rem; border-radius: 50%; background: var(--primary);"></div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.25rem;">${Utils.formatDateTime(entry.timestamp)}</div>
                        <div style="font-weight: 500; font-size: 0.9rem; margin-bottom: 0.25rem;">${entry.action.replace(/_/g, ' ').toUpperCase()}</div>
                        <div style="font-size: 0.85rem; color: var(--text-main); margin-bottom: 0.25rem;">${entry.notes || ''}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">by ${entry.changed_by_username || 'System'}</div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    renderRates(rates, load) {
        const content = document.getElementById('rates-content');
        
        if (!rates || rates.length === 0) {
            content.innerHTML = `
                <p class="text-muted">No rate confirmations generated yet.</p>
                ${App.hasPermission('rate.confirm') && load.carrier_org_id && App.user.account_type === 'broker' ? `
                    <button class="btn btn-outline btn-sm mt-2" onclick="LoadDetailComponent.showCreateRateModal()">Create Rate Con</button>
                ` : ''}
            `;
            return;
        }

        content.innerHTML = rates.map((r, i) => {
            const isLatest = i === 0;
            return `
                <div style="padding: 1rem; border: 1px solid ${isLatest ? 'var(--primary)' : 'var(--border)'}; border-radius: var(--radius); margin-bottom: 1rem; background: ${isLatest ? 'rgba(59, 130, 246, 0.05)' : 'transparent'};">
                    <div class="flex justify-between items-center mb-2">
                        <div style="font-weight: 600;">Version ${r.version} ${isLatest ? '<span class="badge badge-rate_confirmed ml-2" style="font-size:0.6rem;">Active</span>' : ''}</div>
                        <div style="font-size: 1.25rem; font-weight: 700; color: var(--text-main);">${Utils.formatCurrency(r.total_rate)}</div>
                    </div>
                    
                    <div style="display:flex; justify-content:space-between; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
                        <span>Base: ${Utils.formatCurrency(r.base_rate)}</span>
                        <span>Acc: ${Utils.formatCurrency(r.total_rate - r.base_rate)}</span>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 0.8rem; background: rgba(0,0,0,0.2); padding: 0.75rem; border-radius: var(--radius);">
                        <div>
                            <div class="text-muted mb-1">Broker Sign</div>
                            ${r.confirmed_by_broker ? `<span class="text-success"><i class="fa-solid fa-check"></i> Confirmed</span><br><span style="font-size:0.7rem;" class="text-muted">${Utils.formatDate(r.broker_confirmed_at)}</span>` : '<span class="text-warning"><i class="fa-regular fa-clock"></i> Pending</span>'}
                        </div>
                        <div>
                            <div class="text-muted mb-1">Carrier Sign</div>
                            ${r.confirmed_by_carrier ? `<span class="text-success"><i class="fa-solid fa-check"></i> Confirmed</span><br><span style="font-size:0.7rem;" class="text-muted">${Utils.formatDate(r.carrier_confirmed_at)}</span>` : '<span class="text-warning"><i class="fa-regular fa-clock"></i> Pending</span>'}
                        </div>
                    </div>

                    ${isLatest && r.status !== 'fully_confirmed' && App.hasPermission('rate.confirm') ? `
                        <div style="margin-top: 1rem; text-align: center;">
                            ${(App.user.account_type === 'broker' && !r.confirmed_by_broker) || (App.user.account_type === 'carrier' && !r.confirmed_by_carrier) ? `
                                <button class="btn btn-success w-full" onclick="LoadDetailComponent.confirmRate('${r.id}')"><i class="fa-solid fa-file-signature"></i> Sign Rate Con</button>
                            ` : `<span class="text-muted" style="font-size:0.8rem;"><i class="fa-solid fa-hourglass-half"></i> Waiting for other party to sign</span>`}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

        if (App.hasPermission('rate.confirm') && load.carrier_org_id && App.user.account_type === 'broker') {
            content.innerHTML += `<button class="btn btn-outline btn-sm w-full mt-2" onclick="LoadDetailComponent.showCreateRateModal()"><i class="fa-solid fa-plus"></i> Issue Revised Rate</button>`;
        }
    },

    renderActions(load) {
        const container = document.getElementById('load-actions');
        let html = '';

        if (App.user.account_type === 'broker') {
            if (load.status === 'posted' && App.hasPermission('load.assign_carrier')) {
                html += `<button class="btn btn-primary" onclick="LoadDetailComponent.showAssignCarrierModal()"><i class="fa-solid fa-user-plus"></i> Assign Carrier</button>`;
            }
            if (load.status === 'rate_confirmed' && App.hasPermission('load.update_status')) {
                html += `<button class="btn btn-success" onclick="LoadDetailComponent.updateStatus('dispatched')"><i class="fa-solid fa-truck-fast"></i> Dispatch Load</button>`;
            }
            if (load.status === 'pod_verified' && App.hasPermission('load.update_status')) {
                html += `<button class="btn btn-outline" onclick="LoadDetailComponent.updateStatus('closed')">Close Load</button>`;
            }
        } else if (App.user.account_type === 'carrier') {
            if (load.status === 'dispatched' && App.hasPermission('load.update_status')) {
                html += `<button class="btn btn-primary" onclick="LoadDetailComponent.updateStatus('in_transit')">Mark In Transit</button>`;
            }
            if (load.status === 'in_transit' && App.hasPermission('load.update_status')) {
                html += `<button class="btn btn-success" onclick="LoadDetailComponent.updateStatus('delivered')">Mark Delivered</button>`;
            }
            if ((load.status === 'delivered' || load.status === 'in_transit') && App.hasPermission('pod.upload')) {
                html += `<button class="btn btn-outline" onclick="LoadDetailComponent.showUploadPodModal()"><i class="fa-solid fa-file-arrow-up"></i> Upload POD</button>`;
            }
        }

        container.innerHTML = html;
    },

    renderComplianceBanner(load, compliance) {
        const banner = document.getElementById('load-compliance-banner');
        
        if (load.compliance_flagged) {
            let actionHtml = '';
            if (App.user.account_type === 'broker' && App.hasPermission('load.override_compliance_flag')) {
                actionHtml = `<button class="btn btn-danger" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; margin-left: 1rem;" onclick="LoadDetailComponent.overrideCompliance()">Override Flag</button>`;
            }
            
            banner.innerHTML = `
                <div class="alert alert-danger mb-4" style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <i class="fa-solid fa-triangle-exclamation"></i> <strong>COMPLIANCE HOLD:</strong> 
                        Load cannot progress. Reason: ${load.compliance_flag_reason}
                    </div>
                    ${actionHtml}
                </div>
            `;
        } else {
            banner.innerHTML = '';
        }
    },

    // --- Action Handlers ---

    async showAssignCarrierModal() {
        try {
            const { carriers } = await API.get('/compliance/list/all');
            
            const options = carriers.map(c => {
                const compliantStr = c.compliant ? '✓ Compliant' : '⚠ Non-Compliant';
                return `<option value="${c.id}">${c.name} (${compliantStr})</option>`;
            }).join('');

            const formHtml = `
                <form id="form-assign-carrier">
                    <div class="alert alert-info" style="font-size:0.85rem;">
                        <i class="fa-solid fa-circle-info"></i> Note: Assigning a non-compliant carrier will trigger an automatic compliance hold on this load.
                    </div>
                    <div class="form-group mt-4">
                        <label>Select Carrier</label>
                        <select id="ac-carrier" class="form-control" required>
                            <option value="">Select a carrier...</option>
                            ${options}
                        </select>
                    </div>
                </form>
            `;

            Modals.show('Assign Carrier', formHtml, async () => {
                const carrierId = document.getElementById('ac-carrier').value;
                if (!carrierId) throw new Error("Please select a carrier");
                
                const res = await API.put(`/loads/${this.loadId}/assign`, { carrier_org_id: carrierId });
                
                if (res.compliance_flagged) {
                    alert('Carrier assigned, but load placed on COMPLIANCE HOLD: ' + res.compliance_reason);
                }
                this.loadData();
            }, 'Assign');
        } catch (err) {
            alert('Failed to load carriers: ' + err.message);
        }
    },

    async updateStatus(newStatus) {
        try {
            await API.put(`/loads/${this.loadId}/status`, { new_status: newStatus });
            this.loadData();
        } catch (err) {
            alert(err.message);
        }
    },

    async overrideCompliance() {
        const reason = prompt("Enter reason for overriding compliance flag (required for audit log):");
        if (reason === null) return;
        if (!reason.trim()) {
            alert("A reason is required to override.");
            return;
        }

        try {
            await API.put(`/loads/${this.loadId}/override-compliance`, { reason });
            this.loadData();
        } catch (err) {
            alert(err.message);
        }
    },

    showCreateRateModal() {
        const formHtml = `
            <form id="form-create-rate">
                <div class="form-group">
                    <label>Base Rate ($)</label>
                    <input type="number" step="0.01" id="cr-base" class="form-control" required>
                </div>
                <div class="form-group">
                    <label>Accessorials Total ($)</label>
                    <input type="number" step="0.01" id="cr-acc" class="form-control" value="0">
                </div>
                <p class="text-muted" style="font-size:0.8rem; margin-top:1rem;">Creating a new rate confirmation will generate a new version and require signatures from both parties again.</p>
            </form>
        `;

        Modals.show('Issue Rate Confirmation', formHtml, async () => {
            const base = parseFloat(document.getElementById('cr-base').value);
            const acc = parseFloat(document.getElementById('cr-acc').value) || 0;
            
            if (isNaN(base) || base <= 0) throw new Error("Invalid base rate");

            const accessorials = acc > 0 ? [{ type: 'Other', amount: acc }] : [];

            await API.post(`/rates/${this.loadId}`, {
                base_rate: base,
                accessorials
            });
            this.loadData();
        }, 'Create Rate Con');
    },

    async confirmRate(rateId) {
        try {
            await API.put(`/rates/${this.loadId}/${rateId}/confirm`, {});
            this.loadData();
        } catch (err) {
            alert(err.message);
        }
    },

    showUploadPodModal() {
        const formHtml = `
            <form id="form-upload-pod" enctype="multipart/form-data">
                <div class="form-group">
                    <label>Select Document (PDF, JPG, PNG)</label>
                    <input type="file" id="pod-file" name="podFile" class="form-control" accept=".pdf,image/*" required>
                </div>
            </form>
        `;

        Modals.show('Upload Proof of Delivery', formHtml, async () => {
            const fileInput = document.getElementById('pod-file');
            if (!fileInput.files.length) throw new Error("Please select a file");

            const formData = new FormData();
            formData.append('podFile', fileInput.files[0]);

            await API.postForm(`/loads/${this.loadId}/pod`, formData);
            
            // Auto update status to pod_verified by broker or carrier doesn't matter, actually broker usually verifies it.
            // Wait, for this demo, we'll just reload the data. Carrier uploaded it.
            this.loadData();
        }, 'Upload');
    }
};
