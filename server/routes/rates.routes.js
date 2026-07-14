const express = require('express');
const router = express.Router();
const { authenticateToken, requireAccountType } = require('../middleware/auth');
const { requirePermission, orgScope } = require('../middleware/rbac');
const RateConfirmation = require('../models/RateConfirmation');
const Load = require('../models/Load');
const LoadAudit = require('../models/LoadAudit');

router.use(authenticateToken);
router.use(orgScope);

// Create new rate confirmation (Broker only)
router.post('/:load_id', requireAccountType('broker'), requirePermission('rate.confirm'), async (req, res) => {
    const { base_rate, accessorials } = req.body;
    
    if (!base_rate) return res.status(400).json({ error: 'Base rate required' });

    try {
        const load = await Load.findOne({ 
            _id: req.params.load_id,
            broker_org_id: req.orgScope.broker_org_id
        });

        if (!load) return res.status(404).json({ error: 'Load not found' });
        if (!load.carrier_org_id) return res.status(400).json({ error: 'Cannot issue rate without an assigned carrier' });

        const prevRates = await RateConfirmation.find({ load_id: load._id }).sort({ version: -1 });
        const nextVersion = prevRates.length > 0 ? prevRates[0].version + 1 : 1;

        const total_acc = (accessorials || []).reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
        const total_rate = parseFloat(base_rate) + total_acc;

        // Mark old ones rejected if pending
        if (prevRates.length > 0) {
            await RateConfirmation.updateMany(
                { load_id: load._id, status: 'pending' },
                { $set: { status: 'rejected' } }
            );
        }

        const newRate = new RateConfirmation({
            load_id: load._id,
            version: nextVersion,
            base_rate,
            accessorials: accessorials || [],
            total_rate,
            confirmed_by_broker: req.user._id, // Broker signs it upon creation automatically
            broker_confirmed_at: new Date(),
            status: 'pending'
        });
        
        await newRate.save();

        await LoadAudit.create({
            load_id: load._id,
            action: 'rate_issued',
            changed_by: req.user._id,
            changed_by_username: req.user.username,
            notes: `Version ${nextVersion} issued for $${total_rate}`
        });

        res.status(201).json({ message: 'Rate issued', rate_id: newRate._id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Confirm rate (Broker or Carrier)
router.put('/:load_id/:rate_id/confirm', requirePermission('rate.confirm'), async (req, res) => {
    try {
        const loadQuery = { _id: req.params.load_id };
        if (req.orgScope.broker_org_id) loadQuery.broker_org_id = req.orgScope.broker_org_id;
        if (req.orgScope.carrier_org_id) loadQuery.carrier_org_id = req.orgScope.carrier_org_id;

        const load = await Load.findOne(loadQuery);
        if (!load) return res.status(404).json({ error: 'Load not found' });

        const rate = await RateConfirmation.findOne({ _id: req.params.rate_id, load_id: load._id });
        if (!rate) return res.status(404).json({ error: 'Rate confirmation not found' });
        if (rate.status === 'fully_confirmed' || rate.status === 'rejected') {
            return res.status(400).json({ error: 'Rate cannot be modified' });
        }

        let updated = false;
        
        if (req.user.account_type === 'broker') {
            rate.confirmed_by_broker = req.user._id;
            rate.broker_confirmed_at = new Date();
            updated = true;
        } else if (req.user.account_type === 'carrier') {
            rate.confirmed_by_carrier = req.user._id;
            rate.carrier_confirmed_at = new Date();
            updated = true;
        }

        if (rate.confirmed_by_broker && rate.confirmed_by_carrier) {
            rate.status = 'fully_confirmed';
            
            // Advance load status if not flagged
            if (load.status === 'carrier_assigned' && !load.compliance_flagged) {
                const oldStatus = load.status;
                load.status = 'rate_confirmed';
                await load.save();
                
                await LoadAudit.create({
                    load_id: load._id,
                    from_status: oldStatus,
                    to_status: 'rate_confirmed',
                    action: 'status_changed',
                    changed_by: req.user._id,
                    changed_by_username: 'System',
                    notes: 'Rate fully confirmed'
                });
            }
        } else if (updated) {
            rate.status = req.user.account_type === 'broker' ? 'broker_confirmed' : 'carrier_confirmed';
        }

        await rate.save();

        await LoadAudit.create({
            load_id: load._id,
            action: 'rate_signed',
            changed_by: req.user._id,
            changed_by_username: req.user.username,
            notes: `Version ${rate.version} signed by ${req.user.account_type}`
        });

        res.json({ message: 'Rate confirmed successfully', status: rate.status });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
