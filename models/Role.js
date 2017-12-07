const mongoose = require('mongoose');

// Feature schema
const RoleSchema = mongoose.Schema({
  name: {
    type: String,
    unique: true,
    required: true,
    dropDups: true,
    default: 'guest'
  },
  features: [{
    feature_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Feature',
    },
    permission_level: {
      type: Number,
      default: 0
    }
  }]
}, { timestamps: true });
// timestamps allows the db to automatically create 'created_at' and 'updated_at' fields

module.exports = mongoose.model('Role', RoleSchema);
