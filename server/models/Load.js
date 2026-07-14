const mongoose = require('mongoose');

const loadSchema = new mongoose.Schema({
  reference_number: { type: String, required: true, unique: true },
  shipper_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  broker_org_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  carrier_org_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  status: { 
    type: String, 
    required: true, 
    default: 'posted',
    enum: [
      'posted', 'carrier_assigned', 'rate_confirmed', 'dispatched',
      'in_transit', 'delivered', 'pod_verified', 'closed'
    ]
  },
  origin: { type: String, required: true },
  destination: { type: String, required: true },
  weight: { type: Number },
  equipment_type: { type: String },
  commodity: { type: String },
  pickup_date: { type: Date },
  delivery_date: { type: Date },
  special_instructions: { type: String },
  compliance_flagged: { type: Boolean, default: false },
  compliance_flag_reason: { type: String },
  pod_file_path: { type: String },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Load', loadSchema);
