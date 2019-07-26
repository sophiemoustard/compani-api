const mongoose = require('mongoose');

const RightSchema = mongoose.Schema({
  name: {
    type: String,
    dropDups: true,
    index: {
      unique: true,
      partialFilterExpression: { name: { $type: 'string' } },
    },
  },
  description: String,
  permission: {
    type: String,
    unique: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Right', RightSchema);
