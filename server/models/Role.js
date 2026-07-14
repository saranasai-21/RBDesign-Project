const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  org_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  name: { type: String, required: true },
  description: { type: String },
  permissions: [{ type: String }]
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

module.exports = mongoose.model('Role', roleSchema);
