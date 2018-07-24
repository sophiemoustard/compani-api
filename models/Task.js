const mongoose = require('mongoose');

// Task schema
const TaskSchema = mongoose.Schema({
  name: {
    type: String,
    unique: true,
    required: true,
    dropDups: true
  },
  isDone: {
    type: Boolean,
    required: true,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Task', TaskSchema);
