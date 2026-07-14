const express = require('express');
const router = express.Router();
const { authenticateToken, requireAccountType } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { PERMISSION_CATALOG } = require('../database');
const Role = require('../models/Role');
const User = require('../models/User');

// All role management requires being part of an org (Broker or Carrier)
router.use(authenticateToken);
router.use(requireAccountType('broker', 'carrier'));

// Get permission catalog
router.get('/permissions', (req, res) => {
    res.json({ permissions: PERMISSION_CATALOG });
});

// List roles for this organization
router.get('/', requirePermission('role.manage'), async (req, res) => {
    try {
        const roles = await Role.find({ org_id: req.user.org_id });
        res.json({ roles: roles.map(r => ({ id: r._id, name: r.name, description: r.description, permissions: r.permissions })) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create new role
router.post('/', requirePermission('role.manage'), async (req, res) => {
    const { name, description, permissions } = req.body;
    
    if (!name || !Array.isArray(permissions)) {
        return res.status(400).json({ error: 'Name and permissions array are required' });
    }

    // Validate permissions against catalog
    const validKeys = PERMISSION_CATALOG.map(p => p.key);
    const invalidPerms = permissions.filter(p => !validKeys.includes(p));
    
    if (invalidPerms.length > 0) {
        return res.status(400).json({ error: `Invalid permissions: ${invalidPerms.join(', ')}` });
    }

    try {
        const role = new Role({
            org_id: req.user.org_id,
            name,
            description,
            permissions
        });
        await role.save();
        res.status(201).json({ message: 'Role created', id: role._id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete role
router.delete('/:id', requirePermission('role.manage'), async (req, res) => {
    try {
        // Ensure role belongs to this org
        const role = await Role.findOne({ _id: req.params.id, org_id: req.user.org_id });
        if (!role) {
            return res.status(404).json({ error: 'Role not found' });
        }
        
        // Remove role references from users
        await User.updateMany(
            { org_id: req.user.org_id, roles: role._id },
            { $pull: { roles: role._id } }
        );

        await Role.findByIdAndDelete(role._id);
        res.json({ message: 'Role deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
