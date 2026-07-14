const mongoose = require('mongoose');

const carrierComplianceSchema = new mongoose.Schema({
  org_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, unique: true },
  mc_number: { type: String },
  dot_number: { type: String },
  insurance_expiry: { type: Date },
  authority_status: { 
    type: String, 
    enum: ['active', 'suspended', 'revoked'],
    default: 'active'
  },
  approved_equipment: [{ type: String }],
  approved_commodities: [{ type: String }],
  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: { createdAt: false, updatedAt: 'updated_at' } });

module.exports = mongoose.model('CarrierCompliance', carrierComplianceSchema);
