const mongoose = require('mongoose');

const CourseSchema = mongoose.Schema({
  name: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Course', CourseSchema);

