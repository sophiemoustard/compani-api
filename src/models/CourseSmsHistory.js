const mongoose = require('mongoose');
const { CONVOCATION, REMINDER } = require('../helpers/constants');
const { formatQuery } = require('./preHooks/validate');

const MESSAGE_TYPE = [CONVOCATION, REMINDER];

const CourseSmsHistorySchema = mongoose.Schema({
  type: { type: String, required: true, enum: MESSAGE_TYPE },
  date: { type: Date, default: Date.now },
  message: { type: String, required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  missingPhones: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

CourseSmsHistorySchema.pre('countDocuments', formatQuery);
CourseSmsHistorySchema.pre('find', formatQuery);
CourseSmsHistorySchema.pre('findOne', formatQuery);

module.exports = mongoose.model('CourseSmsHistory', CourseSmsHistorySchema);
module.exports.MESSAGE_TYPE = MESSAGE_TYPE;
