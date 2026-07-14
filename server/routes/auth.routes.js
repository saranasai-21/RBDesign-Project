const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');
const { getUserPermissions } = require('../middleware/rbac');

const User = require('../models/User');
const Organization = require('../models/Organization');
const CarrierCompliance = require('../models/CarrierCompliance');

// Register new organization and admin user
router.post('/register', async (req, res) => {
    const { account_type, org_name, username, email, password } = req.body;
    
    if (!account_type || !username || !email || !password) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(409).json({ error: 'Username or email already exists' });
        }

        const password_hash = await bcrypt.hash(password, 10);
        let org_id = null;

        if (account_type !== 'shipper') {
            if (!org_name) return res.status(400).json({ error: 'Organization name required for brokers/carriers' });
            
            const org = new Organization({
                name: org_name,
                type: account_type
            });
            await org.save();
            org_id = org._id;

            if (account_type === 'carrier') {
                const comp = new CarrierCompliance({ org_id });
                await comp.save();
            }
        }

        const user = new User({
            org_id,
            username,
            email,
            password_hash,
            account_type,
            is_admin: true // First user is admin
        });
        await user.save();

        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '24h' });
        
        res.status(201).json({
            message: 'Registration successful',
            token,
            user: {
                id: user._id,
                username: user.username,
                account_type: user.account_type,
                org_name: org_name || null,
                is_admin: user.is_admin
            }
        });
    } catch (err) {
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    let { username, password } = req.body;
    
    // Trim whitespace to prevent copy-paste errors
    username = (username || '').trim();
    password = (password || '').trim();

    try {
        // Find user by either username or email, case-insensitive
        const user = await User.findOne({
            $or: [
                { username: new RegExp('^' + username + '$', 'i') },
                { email: new RegExp('^' + username + '$', 'i') }
            ]
        }).populate('roles');
        
        if (!user || !user.is_active) {
            return res.status(401).json({ error: 'Invalid credentials or inactive account' });
        }

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        let org_name = null;
        if (user.org_id) {
            const org = await Organization.findById(user.org_id);
            if (org) org_name = org.name;
        }

        const permissions = getUserPermissions(user);
        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '24h' });

        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                account_type: user.account_type,
                org_id: user.org_id,
                org_name: org_name,
                is_admin: user.is_admin
            },
            permissions
        });
    } catch (err) {
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

// Get current user context
router.get('/me', authenticateToken, async (req, res) => {
    try {
        let org_name = null;
        if (req.user.org_id) {
            const org = await Organization.findById(req.user.org_id);
            if (org) org_name = org.name;
        }

        res.json({
            user: {
                id: req.user._id,
                username: req.user.username,
                account_type: req.user.account_type,
                org_id: req.user.org_id,
                org_name: org_name,
                is_admin: req.user.is_admin
            },
            permissions: getUserPermissions(req.user)
        });
    } catch (err) {
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

module.exports = router;
