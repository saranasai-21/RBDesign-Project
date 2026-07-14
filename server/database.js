const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/loadflow';
        await mongoose.connect(uri);
        console.log('MongoDB Connected to', uri);
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

const PERMISSION_CATALOG = [
    { key: 'staff.manage', description: 'Can add, edit, or deactivate staff members' },
    { key: 'role.manage', description: 'Can create and edit custom roles' },
    
    { key: 'load.create', description: 'Can post new loads to the board' },
    { key: 'load.assign_carrier', description: 'Can assign a carrier to a load' },
    { key: 'load.update_status', description: 'Can progress load status (e.g. dispatched, delivered)' },
    { key: 'load.override_compliance_flag', description: 'Can override carrier compliance blocks' },
    
    { key: 'rate.confirm', description: 'Can issue and sign rate confirmations' },
    
    { key: 'compliance.manage', description: 'Can update carrier compliance documentation' },
    { key: 'pod.upload', description: 'Can upload Proof of Delivery documents' }
];

const LOAD_STATE_TRANSITIONS = {
    'posted': ['carrier_assigned'],
    'carrier_assigned': ['rate_confirmed', 'posted'], 
    'rate_confirmed': ['dispatched', 'carrier_assigned'],
    'dispatched': ['in_transit'],
    'in_transit': ['delivered'],
    'delivered': ['pod_verified'],
    'pod_verified': ['closed']
};

module.exports = {
    connectDB,
    PERMISSION_CATALOG,
    LOAD_STATE_TRANSITIONS
};
