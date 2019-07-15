const mongoose = require('mongoose');
const autopopulate = require('mongoose-autopopulate');

const RoleSchema = mongoose.Schema({
  name: { type: String, unique: true, required: true },
  rights: [{
    right_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Right',
      autopopulate: { select: 'name description permission _id' },
    },
    hasAccess: { type: Boolean, default: false },
    rolesConcerned: [{
      role_id: { type: mongoose.Schema.Types.ObjectId },
      name: String,
    }],
  }],
}, { timestamps: true });

RoleSchema.plugin(autopopulate);

module.exports = mongoose.model('Role', RoleSchema);
