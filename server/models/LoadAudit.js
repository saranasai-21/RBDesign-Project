const mongoose = require('mongoose');

const loadAuditSchema = new mongoose.Schema({
  load_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Load', required: true },
  from_status: { type: String },
  to_status: { type: String },
  action: { type: String, required: true },
  changed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  changed_by_username: { type: String },
  timestamp: { type: Date, default: Date.now },
  notes: { type: String }
});

module.exports = mongoose.model('LoadAudit', loadAuditSchema);
