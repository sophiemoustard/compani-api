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


function populateRight(doc, next) {
  if (doc && doc.rights) {
    const rights = [];
    for (const right of doc.rights) {
      rights.push({ ...right.right_id, hasAccess: right.hasAccess, right_id: right.right_id._id });
    }
    doc.rights = rights;
  }

  return next();
}

function populateRights(docs, next) {
  for (const doc of docs) {
    if (doc && doc.rights) {
      const rights = [];
      for (const right of doc.rights) {
        rights.push({ ...right.right_id, hasAccess: right.hasAccess, right_id: right.right_id._id });
      }
      doc.rights = rights;
    }
  }

  return next();
}

RoleSchema.post('findOne', populateRight);
RoleSchema.post('findOneAndUpdate', populateRight);
RoleSchema.post('find', populateRights);

RoleSchema.plugin(autopopulate);

module.exports = mongoose.model('Role', RoleSchema);
