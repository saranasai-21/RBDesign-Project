const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_hackathon_key';

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        // Find user and populate roles
        const user = await User.findById(decoded.id).populate('roles');
        
        if (!user || !user.is_active) {
            return res.status(401).json({ error: 'User not found or inactive' });
        }
        
        req.user = user;
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};

const requireAccountType = (...types) => {
    return (req, res, next) => {
        if (!types.includes(req.user.account_type)) {
            return res.status(403).json({ error: `Requires one of account types: ${types.join(', ')}` });
        }
        next();
    };
};

module.exports = { authenticateToken, requireAccountType, JWT_SECRET };
