const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission, orgScope } = require('../middleware/rbac');
const Load = require('../models/Load');
const LoadAudit = require('../models/LoadAudit');

const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, 'pod-' + req.params.id + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

router.use(authenticateToken);
router.use(orgScope);

// Upload POD
router.post('/:id/pod', requirePermission('pod.upload'), upload.single('podFile'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    try {
        const query = { _id: req.params.id };
        if (req.orgScope.broker_org_id) query.broker_org_id = req.orgScope.broker_org_id;
        if (req.orgScope.carrier_org_id) query.carrier_org_id = req.orgScope.carrier_org_id;

        const load = await Load.findOne(query);
        if (!load) {
            fs.unlinkSync(req.file.path); // clean up
            return res.status(404).json({ error: 'Load not found' });
        }

        const oldStatus = load.status;
        load.pod_file_path = req.file.path;
        
        // Optionally auto-advance status if it's delivered
        if (load.status === 'delivered') {
            load.status = 'pod_verified'; // simplified logic
            
            await LoadAudit.create({
                load_id: load._id,
                from_status: oldStatus,
                to_status: 'pod_verified',
                action: 'status_changed',
                changed_by: req.user._id,
                changed_by_username: req.user.username,
                notes: 'Status updated via POD upload'
            });
        }
        
        await load.save();

        await LoadAudit.create({
            load_id: load._id,
            action: 'pod_uploaded',
            changed_by: req.user._id,
            changed_by_username: req.user.username,
            notes: `File: ${req.file.originalname}`
        });

        res.json({ message: 'POD Uploaded' });
    } catch (err) {
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: err.message });
    }
});

// Download POD (Anyone with access to the load can view)
router.get('/:id/download', async (req, res) => {
    try {
        const query = { _id: req.params.id };
        if (req.orgScope.broker_org_id) query.broker_org_id = req.orgScope.broker_org_id;
        if (req.orgScope.carrier_org_id) query.carrier_org_id = req.orgScope.carrier_org_id;
        if (req.orgScope.shipper_id) query.shipper_id = req.orgScope.shipper_id;

        const load = await Load.findOne(query);
        if (!load || !load.pod_file_path) {
            return res.status(404).json({ error: 'Document not found' });
        }

        res.download(load.pod_file_path);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
