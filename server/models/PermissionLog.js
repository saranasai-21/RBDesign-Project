const mongoose = require('mongoose');

const permissionLogSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  username: { type: String },
  endpoint: { type: String },
  method: { type: String },
  required_permission: { type: String },
  reason: { type: String },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PermissionLog', permissionLogSchema);
