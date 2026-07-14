const express = require('express');
const router = express.Router();
const { authenticateToken, requireAccountType } = require('../middleware/auth');
const { requirePermission, orgScope } = require('../middleware/rbac');
const { LOAD_STATE_TRANSITIONS } = require('../database');
const { checkCarrierCompliance } = require('./compliance.routes');

const Load = require('../models/Load');
const LoadAudit = require('../models/LoadAudit');
const Organization = require('../models/Organization');
const User = require('../models/User');
const CarrierCompliance = require('../models/CarrierCompliance');

router.use(authenticateToken);
router.use(orgScope);

// Create Load (Broker only)
router.post('/', requireAccountType('broker'), requirePermission('load.create'), async (req, res) => {
    const { shipper_id, origin, destination, pickup_date, delivery_date, weight, equipment_type, commodity, special_instructions } = req.body;

    if (!shipper_id || !origin || !destination) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const refNum = 'LDF-' + Date.now().toString().slice(-6);
        
        const load = new Load({
            reference_number: refNum,
            shipper_id,
            broker_org_id: req.orgScope.broker_org_id,
            origin,
            destination,
            pickup_date,
            delivery_date,
            weight,
            equipment_type,
            commodity,
            special_instructions,
            created_by: req.user._id,
            status: 'posted'
        });
        
        await load.save();

        await LoadAudit.create({
            load_id: load._id,
            action: 'load_created',
            changed_by: req.user._id,
            changed_by_username: req.user.username,
            notes: 'Load initially posted'
        });

        res.status(201).json({ message: 'Load created', id: load._id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// List Loads
router.get('/', async (req, res) => {
    const { status, search } = req.query;
    
    let query = {};
    if (req.orgScope.broker_org_id) query.broker_org_id = req.orgScope.broker_org_id;
    if (req.orgScope.carrier_org_id) query.carrier_org_id = req.orgScope.carrier_org_id;
    if (req.orgScope.shipper_id) query.shipper_id = req.orgScope.shipper_id;

    if (status) query.status = status;

    if (search) {
        query.$or = [
            { reference_number: new RegExp(search, 'i') },
            { origin: new RegExp(search, 'i') },
            { destination: new RegExp(search, 'i') }
        ];
    }

    try {
        const loads = await Load.find(query)
            .populate('broker_org_id', 'name')
            .populate('carrier_org_id', 'name')
            .sort({ created_at: -1 })
            .limit(100);
            
        const safeLoads = loads.map(l => {
            const doc = l.toObject();
            return {
                id: doc._id,
                reference_number: doc.reference_number,
                origin: doc.origin,
                destination: doc.destination,
                pickup_date: doc.pickup_date,
                delivery_date: doc.delivery_date,
                status: doc.status,
                compliance_flagged: doc.compliance_flagged,
                broker_name: doc.broker_org_id?.name,
                carrier_name: doc.carrier_org_id?.name
            };
        });

        res.json({ loads: safeLoads });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Load Details
router.get('/:id', async (req, res) => {
    try {
        let query = { _id: req.params.id };
        if (req.orgScope.broker_org_id) query.broker_org_id = req.orgScope.broker_org_id;
        if (req.orgScope.carrier_org_id) query.carrier_org_id = req.orgScope.carrier_org_id;
        if (req.orgScope.shipper_id) query.shipper_id = req.orgScope.shipper_id;

        const load = await Load.findOne(query)
            .populate('broker_org_id', 'name')
            .populate('carrier_org_id', 'name');
            
        if (!load) return res.status(404).json({ error: 'Load not found' });

        const shipper = await User.findById(load.shipper_id).select('username email');
        
        let compliance = null;
        if (load.carrier_org_id) {
            compliance = await CarrierCompliance.findOne({ org_id: load.carrier_org_id._id });
        }

        const audit = await LoadAudit.find({ load_id: load._id }).sort({ timestamp: -1 });

        // require rates model manually if not populated, but we can query it directly
        const RateConfirmation = require('../models/RateConfirmation');
        const rates = await RateConfirmation.find({ load_id: load._id }).sort({ version: -1 });

        const loadObj = load.toObject();
        loadObj.broker_name = loadObj.broker_org_id?.name;
        loadObj.carrier_name = loadObj.carrier_org_id?.name;
        loadObj.id = loadObj._id;

        res.json({
            load: loadObj,
            shipper: shipper ? { id: shipper._id, username: shipper.username, email: shipper.email } : null,
            compliance,
            audit,
            rates
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Assign Carrier
router.put('/:id/assign', requireAccountType('broker'), requirePermission('load.assign_carrier'), async (req, res) => {
    const { carrier_org_id } = req.body;
    if (!carrier_org_id) return res.status(400).json({ error: 'Carrier org ID required' });

    try {
        const load = await Load.findOne({ _id: req.params.id, broker_org_id: req.orgScope.broker_org_id });
        if (!load) return res.status(404).json({ error: 'Load not found' });

        const carrier = await Organization.findOne({ _id: carrier_org_id, type: 'carrier' });
        if (!carrier) return res.status(400).json({ error: 'Invalid carrier organization' });

        const comp = await CarrierCompliance.findOne({ org_id: carrier._id });
        const compStatus = checkCarrierCompliance(comp);

        const oldStatus = load.status;
        load.carrier_org_id = carrier._id;
        load.status = 'carrier_assigned';
        
        if (!compStatus.compliant) {
            load.compliance_flagged = true;
            load.compliance_flag_reason = compStatus.alerts.map(a => a.message).join(' | ');
        } else {
            load.compliance_flagged = false;
            load.compliance_flag_reason = null;
        }

        await load.save();

        await LoadAudit.create({
            load_id: load._id,
            from_status: oldStatus,
            to_status: 'carrier_assigned',
            action: 'carrier_assigned',
            changed_by: req.user._id,
            changed_by_username: req.user.username,
            notes: `Assigned to ${carrier.name}. Compliance flag: ${load.compliance_flagged}`
        });

        res.json({ 
            message: 'Carrier assigned', 
            compliance_flagged: load.compliance_flagged,
            compliance_reason: load.compliance_flag_reason 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Status
router.put('/:id/status', requirePermission('load.update_status'), async (req, res) => {
    const { new_status } = req.body;
    
    try {
        let query = { _id: req.params.id };
        if (req.orgScope.broker_org_id) query.broker_org_id = req.orgScope.broker_org_id;
        if (req.orgScope.carrier_org_id) query.carrier_org_id = req.orgScope.carrier_org_id;
        
        const load = await Load.findOne(query);
        if (!load) return res.status(404).json({ error: 'Load not found' });

        if (load.compliance_flagged && new_status !== 'posted') {
            return res.status(400).json({ error: 'Load is flagged for compliance. Cannot progress status until resolved or overridden.' });
        }

        const validTransitions = LOAD_STATE_TRANSITIONS[load.status] || [];
        if (!validTransitions.includes(new_status)) {
            return res.status(400).json({ error: `Invalid transition from ${load.status} to ${new_status}` });
        }

        const oldStatus = load.status;
        load.status = new_status;
        await load.save();

        await LoadAudit.create({
            load_id: load._id,
            from_status: oldStatus,
            to_status: new_status,
            action: 'status_changed',
            changed_by: req.user._id,
            changed_by_username: req.user.username
        });

        res.json({ message: 'Status updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Override compliance flag
router.put('/:id/override-compliance', requirePermission('load.override_compliance_flag'), async (req, res) => {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'Override reason required' });

    try {
        const load = await Load.findOne({ _id: req.params.id, broker_org_id: req.orgScope.broker_org_id });
        if (!load) return res.status(404).json({ error: 'Load not found' });

        load.compliance_flagged = false;
        load.compliance_flag_reason = `OVERRIDDEN: ${reason}`;
        await load.save();

        await LoadAudit.create({
            load_id: load._id,
            action: 'compliance_overridden',
            changed_by: req.user._id,
            changed_by_username: req.user.username,
            notes: reason
        });

        res.json({ message: 'Compliance flag overridden' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Summary Stats
router.get('/stats/summary', async (req, res) => {
    try {
        let match = {};
        if (req.orgScope.broker_org_id) match.broker_org_id = req.orgScope.broker_org_id;
        if (req.orgScope.carrier_org_id) match.carrier_org_id = req.orgScope.carrier_org_id;
        if (req.orgScope.shipper_id) match.shipper_id = req.orgScope.shipper_id;

        const agg = await Load.aggregate([
            { $match: match },
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);

        const stats = {
            posted: 0, carrier_assigned: 0, rate_confirmed: 0,
            dispatched: 0, in_transit: 0, delivered: 0, 
            pod_verified: 0, closed: 0, total: 0, compliance_flagged: 0
        };

        agg.forEach(r => {
            stats[r._id] = r.count;
            stats.total += r.count;
        });

        const flaggedCount = await Load.countDocuments({ ...match, compliance_flagged: true });
        stats.compliance_flagged = flaggedCount;

        // Also fetch shippers for dropdown if broker
        let shippers = [];
        if (req.user.account_type === 'broker') {
            const sh = await User.find({ account_type: 'shipper' }).select('username email');
            shippers = sh.map(s => ({ id: s._id, username: s.username, email: s.email }));
        }

        res.json({ stats, shippers });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
