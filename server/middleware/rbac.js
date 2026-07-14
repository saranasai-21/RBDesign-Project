const PermissionLog = require('../models/PermissionLog');

const getUserPermissions = (user) => {
    if (user.is_admin) return ['*'];
    if (!user.roles || user.roles.length === 0) return [];
    
    // Aggregate all permissions from all assigned roles
    const perms = new Set();
    user.roles.forEach(role => {
        if (role.permissions) {
            role.permissions.forEach(p => perms.add(p));
        }
    });
    
    return Array.from(perms);
};

const requirePermission = (permissionKey) => {
    return async (req, res, next) => {
        const perms = getUserPermissions(req.user);
        
        if (req.user.is_admin || perms.includes(permissionKey)) {
            return next();
        }

        // Log denied attempt
        try {
            await PermissionLog.create({
                user_id: req.user._id,
                username: req.user.username,
                endpoint: req.originalUrl,
                method: req.method,
                required_permission: permissionKey,
                reason: 'Insufficient permissions'
            });
        } catch (e) {
            console.error('Failed to log permission denial:', e);
        }

        return res.status(403).json({ error: `Permission denied. Requires: ${permissionKey}` });
    };
};

// Organization scoping middleware
const orgScope = (req, res, next) => {
    req.orgScope = {};
    if (req.user.account_type === 'broker') {
        req.orgScope.broker_org_id = req.user.org_id;
    } else if (req.user.account_type === 'carrier') {
        req.orgScope.carrier_org_id = req.user.org_id;
    } else if (req.user.account_type === 'shipper') {
        req.orgScope.shipper_id = req.user._id;
    }
    next();
};

module.exports = {
    requirePermission,
    getUserPermissions,
    orgScope
};
