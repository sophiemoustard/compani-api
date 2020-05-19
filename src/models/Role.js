const mongoose = require('mongoose');
const autopopulate = require('mongoose-autopopulate');
const Right = require('./Right'); // required to help mongoose detect the Right model
const { VENDOR, CLIENT } = require('../helpers/constants');

const INTERFACE_TYPES = [CLIENT, VENDOR];

const RoleSchema = mongoose.Schema({
  name: { type: String, unique: true, required: true },
  interface: { type: String, enum: INTERFACE_TYPES, required: true },
  rights: [{
    right_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: Right,
      autopopulate: { select: 'description permission _id subscription' },
    },
    hasAccess: { type: Boolean, default: false },
  }],
}, { timestamps: true });

const formatRights = (rights) => {
  const formattedRights = [];
  for (const right of rights) {
    formattedRights.push({ ...right.right_id, hasAccess: right.hasAccess, right_id: right.right_id._id });
  }
  return formattedRights;
};

function populateRight(doc, next) {
  if (doc && doc.rights) doc.rights = formatRights(doc.rights);

  return next();
}

function populateRights(docs, next) {
  for (const doc of docs) {
    if (doc && doc.rights) doc.rights = formatRights(doc.rights);
  }

  return next();
}

RoleSchema.post('findOne', populateRight);
RoleSchema.post('findOneAndUpdate', populateRight);
RoleSchema.post('find', populateRights);

RoleSchema.plugin(autopopulate);

module.exports = mongoose.model('Role', RoleSchema);
