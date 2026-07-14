const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  org_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  account_type: { 
    type: String, 
    required: true, 
    enum: ['broker', 'carrier', 'shipper'] 
  },
  is_admin: { type: Boolean, default: false },
  is_active: { type: Boolean, default: true },
  roles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }]
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

module.exports = mongoose.model('User', userSchema);
