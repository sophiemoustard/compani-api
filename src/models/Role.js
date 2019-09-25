const mongoose = require('mongoose');
const autopopulate = require('mongoose-autopopulate');
const Right = require('./Right'); // required to help mongoose detect the Right model

const RoleSchema = mongoose.Schema({
  name: { type: String, unique: true, required: true },
  rights: [{
    right_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: Right,
      autopopulate: { select: 'description permission _id' },
    },
    hasAccess: { type: Boolean, default: false },
  }],
}, { timestamps: true });

RoleSchema.plugin(autopopulate);

module.exports = mongoose.model('Role', RoleSchema);
