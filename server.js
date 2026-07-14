require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./server/database');

// Import routes
const authRoutes = require('./server/routes/auth.routes');
const staffRoutes = require('./server/routes/staff.routes');
const rolesRoutes = require('./server/routes/roles.routes');
const loadsRoutes = require('./server/routes/loads.routes');
const { router: complianceRoutes } = require('./server/routes/compliance.routes');
const ratesRoutes = require('./server/routes/rates.routes');
const podRoutes = require('./server/routes/pod.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/loads', loadsRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/rates', ratesRoutes);
app.use('/api/loads', podRoutes); // POD routes are nested under loads

// Start server
app.listen(PORT, () => {
    console.log(`LoadFlow Server running on port ${PORT}`);
    console.log(`Access frontend at http://localhost:${PORT}`);
});
