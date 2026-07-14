require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Models
const Organization = require('./models/Organization');
const Role = require('./models/Role');
const User = require('./models/User');
const CarrierCompliance = require('./models/CarrierCompliance');
const Load = require('./models/Load');
const LoadAudit = require('./models/LoadAudit');
const RateConfirmation = require('./models/RateConfirmation');
const PermissionLog = require('./models/PermissionLog');

const { PERMISSION_CATALOG } = require('./database');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/loadflow';

async function seed() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(uri);
        console.log('Connected to', uri);

        console.log('Clearing existing data...');
        await Organization.deleteMany({});
        await Role.deleteMany({});
        await User.deleteMany({});
        await CarrierCompliance.deleteMany({});
        await Load.deleteMany({});
        await LoadAudit.deleteMany({});
        await RateConfirmation.deleteMany({});
        await PermissionLog.deleteMany({});

        const password_hash = await bcrypt.hash('password123', 10);

        // --- 1. Orgs ---
        console.log('Creating organizations...');
        const brokerOrg = new Organization({ name: 'FastLane Logistics', type: 'broker' });
        const carrierOrg = new Organization({ name: 'Highway Haulers', type: 'carrier' });
        await brokerOrg.save();
        await carrierOrg.save();

        // --- 2. Roles ---
        console.log('Creating roles...');
        const dispatcherRole = new Role({
            org_id: brokerOrg._id,
            name: 'Dispatcher',
            description: 'Can post loads and assign carriers',
            permissions: ['load.create', 'load.assign_carrier']
        });
        
        const carrierDriverRole = new Role({
            org_id: carrierOrg._id,
            name: 'Driver',
            description: 'Can update status and upload PODs',
            permissions: ['load.update_status', 'pod.upload']
        });

        await dispatcherRole.save();
        await carrierDriverRole.save();

        // --- 3. Users ---
        console.log('Creating users...');
        const users = await User.insertMany([
            {
                username: 'brokeradmin',
                email: 'admin@fastlane.com',
                password_hash,
                account_type: 'broker',
                org_id: brokerOrg._id,
                is_admin: true
            },
            {
                username: 'dispatcher1',
                email: 'disp1@fastlane.com',
                password_hash,
                account_type: 'broker',
                org_id: brokerOrg._id,
                is_admin: false,
                roles: [dispatcherRole._id]
            },
            {
                username: 'carrieradmin',
                email: 'admin@highwayhaulers.com',
                password_hash,
                account_type: 'carrier',
                org_id: carrierOrg._id,
                is_admin: true
            },
            {
                username: 'driver1',
                email: 'driver1@highwayhaulers.com',
                password_hash,
                account_type: 'carrier',
                org_id: carrierOrg._id,
                is_admin: false,
                roles: [carrierDriverRole._id]
            },
            {
                username: 'shipperuser',
                email: 'shipping@bigcorp.com',
                password_hash,
                account_type: 'shipper',
                is_admin: false
            }
        ]);

        const brokerAdmin = users[0];
        const shipperUser = users[4];

        // --- 4. Carrier Compliance ---
        console.log('Creating compliance records...');
        const comp = new CarrierCompliance({
            org_id: carrierOrg._id,
            mc_number: 'MC-123456',
            dot_number: 'DOT-789012',
            insurance_expiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
            authority_status: 'active',
            approved_equipment: ['Van', 'Reefer'],
            approved_commodities: ['General Freight']
        });
        await comp.save();

        // --- 5. Loads ---
        console.log('Creating loads...');
        const load1 = new Load({
            reference_number: 'LDF-10001',
            shipper_id: shipperUser._id,
            broker_org_id: brokerOrg._id,
            origin: 'Chicago, IL',
            destination: 'Dallas, TX',
            pickup_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
            delivery_date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
            weight: 42000,
            equipment_type: 'Van',
            commodity: 'Electronics',
            status: 'posted',
            created_by: brokerAdmin._id
        });

        const load2 = new Load({
            reference_number: 'LDF-10002',
            shipper_id: shipperUser._id,
            broker_org_id: brokerOrg._id,
            carrier_org_id: carrierOrg._id,
            origin: 'Atlanta, GA',
            destination: 'Miami, FL',
            pickup_date: new Date(),
            delivery_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
            weight: 38000,
            equipment_type: 'Reefer',
            commodity: 'Produce',
            status: 'carrier_assigned',
            created_by: brokerAdmin._id
        });

        await load1.save();
        await load2.save();

        // --- 6. Audits ---
        console.log('Creating audits...');
        await LoadAudit.insertMany([
            {
                load_id: load1._id,
                action: 'load_created',
                changed_by: brokerAdmin._id,
                changed_by_username: brokerAdmin.username,
                notes: 'Seeded'
            },
            {
                load_id: load2._id,
                action: 'load_created',
                changed_by: brokerAdmin._id,
                changed_by_username: brokerAdmin.username,
                notes: 'Seeded'
            },
            {
                load_id: load2._id,
                action: 'carrier_assigned',
                to_status: 'carrier_assigned',
                changed_by: brokerAdmin._id,
                changed_by_username: brokerAdmin.username,
                notes: 'Assigned to Highway Haulers'
            }
        ]);

        console.log('Seeding complete!');
        process.exit(0);

    } catch (err) {
        console.error('Seeding error:', err);
        process.exit(1);
    }
}

seed();
