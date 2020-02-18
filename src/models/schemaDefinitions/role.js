const mongoose = require('mongoose');

module.exports = {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Role',
  autopopulate: { select: '-__v -createdAt -updatedAt', maxDepth: 3 },
};
