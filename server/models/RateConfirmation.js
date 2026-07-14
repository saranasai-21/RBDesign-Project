const mongoose = require('mongoose');

const rateConfirmationSchema = new mongoose.Schema({
  load_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Load', required: true },
  version: { type: Number, required: true, default: 1 },
  base_rate: { type: Number, required: true },
  accessorials: [{ 
    type: { type: String }, 
    amount: { type: Number } 
  }],
  total_rate: { type: Number, required: true },
  confirmed_by_broker: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  confirmed_by_carrier: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  broker_confirmed_at: { type: Date },
  carrier_confirmed_at: { type: Date },
  status: { 
    type: String, 
    default: 'pending',
    enum: ['pending', 'broker_confirmed', 'carrier_confirmed', 'fully_confirmed', 'rejected']
  }
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

module.exports = mongoose.model('RateConfirmation', rateConfirmationSchema);
