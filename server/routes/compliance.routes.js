const express = require('express');
const router = express.Router();
const { authenticateToken, requireAccountType } = require('../middleware/auth');
const { requirePermission, orgScope } = require('../middleware/rbac');
const CarrierCompliance = require('../models/CarrierCompliance');
const Organization = require('../models/Organization');

router.use(authenticateToken);

const checkCarrierCompliance = (comp) => {
    if (!comp) return { compliant: false, alerts: [{ type: 'danger', message: 'No compliance record found' }] };
    
    const alerts = [];
    let compliant = true;

    if (!comp.insurance_expiry || new Date(comp.insurance_expiry) < new Date()) {
        alerts.push({ type: 'danger', message: 'Insurance is expired or missing.' });
        compliant = false;
    } else if (new Date(comp.insurance_expiry) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) {
        alerts.push({ type: 'warning', message: 'Insurance expires within 30 days.' });
    }

    if (comp.authority_status !== 'active') {
        alerts.push({ type: 'danger', message: `Authority status is ${comp.authority_status}.` });
        compliant = false;
    }

    return { compliant, alerts, details: comp };
};

// Carrier getting/updating their own compliance
router.get('/', requireAccountType('carrier'), async (req, res) => {
    try {
        const comp = await CarrierCompliance.findOne({ org_id: req.user.org_id });
        res.json({
            compliance: comp,
            ...checkCarrierCompliance(comp)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/', requireAccountType('carrier'), requirePermission('compliance.manage'), async (req, res) => {
    const { mc_number, dot_number, insurance_expiry, authority_status, approved_equipment, approved_commodities } = req.body;
    
    try {
        let comp = await CarrierCompliance.findOne({ org_id: req.user.org_id });
        if (!comp) {
            comp = new CarrierCompliance({ org_id: req.user.org_id });
        }
        
        if (mc_number !== undefined) comp.mc_number = mc_number;
        if (dot_number !== undefined) comp.dot_number = dot_number;
        if (insurance_expiry !== undefined) comp.insurance_expiry = insurance_expiry;
        if (authority_status !== undefined) comp.authority_status = authority_status;
        if (approved_equipment !== undefined) comp.approved_equipment = approved_equipment;
        if (approved_commodities !== undefined) comp.approved_commodities = approved_commodities;
        
        comp.updated_by = req.user._id;
        
        await comp.save();
        res.json({ message: 'Compliance profile updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Brokers checking compliance of carriers
router.get('/list/all', requireAccountType('broker'), async (req, res) => {
    try {
        const carriers = await Organization.find({ type: 'carrier' });
        const complianceRecords = await CarrierCompliance.find({});
        
        const compMap = {};
        complianceRecords.forEach(c => {
            compMap[c.org_id.toString()] = c;
        });

        const list = carriers.map(c => {
            const status = checkCarrierCompliance(compMap[c._id.toString()]);
            return {
                id: c._id,
                name: c.name,
                mc_number: compMap[c._id.toString()]?.mc_number,
                compliant: status.compliant,
                alerts: status.alerts
            };
        });

        res.json({ carriers: list });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = { router, checkCarrierCompliance };
