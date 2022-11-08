const mongoose = require('mongoose');
const { formatQuery, queryMiddlewareList } = require('./preHooks/validate');
const addressSchemaDefinition = require('./schemaDefinitions/address');

const CourseSlotSchema = mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  startDate: { type: Date, required() { return !!this.endDate; } },
  endDate: { type: Date, required() { return !!this.startDate; } },
  address: { type: mongoose.Schema(addressSchemaDefinition, { _id: false, id: false }) },
  meetingLink: { type: String, trim: true },
  step: { type: mongoose.Schema.Types.ObjectId, ref: 'Step', required: true },
}, { timestamps: true });

queryMiddlewareList.map(middleware => CourseSlotSchema.pre(middleware, formatQuery));

CourseSlotSchema.virtual('attendances', { ref: 'Attendance', localField: '_id', foreignField: 'courseSlot' });

module.exports = mongoose.model('CourseSlot', CourseSlotSchema);
