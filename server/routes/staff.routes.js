const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { authenticateToken, requireAccountType } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const User = require('../models/User');

router.use(authenticateToken);
router.use(requireAccountType('broker', 'carrier'));

// List staff for this org
router.get('/', requirePermission('staff.manage'), async (req, res) => {
    try {
        const staff = await User.find({ org_id: req.user.org_id }).populate('roles');
        
        const safeStaff = staff.map(s => ({
            id: s._id,
            username: s.username,
            email: s.email,
            is_admin: s.is_admin,
            is_active: s.is_active,
            roles: s.roles.map(r => ({ id: r._id, name: r.name }))
        }));
        
        res.json({ staff: safeStaff });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create staff member
router.post('/', requirePermission('staff.manage'), async (req, res) => {
    const { username, email, password, role_ids } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const existing = await User.findOne({ $or: [{ username }, { email }] });
        if (existing) {
            return res.status(409).json({ error: 'Username or email already exists' });
        }

        const password_hash = await bcrypt.hash(password, 10);
        
        const user = new User({
            org_id: req.user.org_id,
            username,
            email,
            password_hash,
            account_type: req.user.account_type,
            is_admin: false,
            roles: role_ids || []
        });
        await user.save();
        
        res.status(201).json({ message: 'Staff created', id: user._id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update staff roles
router.put('/:id', requirePermission('staff.manage'), async (req, res) => {
    const { role_ids, is_active } = req.body;
    
    try {
        const targetUser = await User.findOne({ _id: req.params.id, org_id: req.user.org_id });
        
        if (!targetUser) return res.status(404).json({ error: 'Staff not found' });
        if (targetUser.is_admin) return res.status(403).json({ error: 'Cannot modify admin account' });

        if (role_ids !== undefined) targetUser.roles = role_ids;
        if (is_active !== undefined) targetUser.is_active = is_active;
        
        await targetUser.save();
        res.json({ message: 'Staff updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
