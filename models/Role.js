const mongoose = require('mongoose');
const autopopulate = require('mongoose-autopopulate');

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
      autopopulate: { select: 'name _id' }
    },
    permission_level: {
      type: Number,
      default: 0,
      min: [0, 'Value must be between 0 and 2'],
      max: [2, 'Value must be between 0 and 2']
    }
  }]
}, { timestamps: true });

// function populateRoles() {
//   console.log(this.getQuery());
//   this.populate({
//     path: 'features.feature_id',
//     select: '_id name',
//     model: Feature
//   });
// }

// RoleSchema.pre('find', populateRoles);
RoleSchema.plugin(autopopulate);

module.exports = mongoose.model('Role', RoleSchema);
