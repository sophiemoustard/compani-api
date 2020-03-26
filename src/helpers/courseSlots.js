const CourseSlot = require('../models/CourseSlot');

exports.createCourseSlot = payload => (new CourseSlot(payload)).save();

exports.updateCourseSlot = async (courseSlotId, payload) =>
  CourseSlot.findOneAndUpdate({ _id: courseSlotId }, { $set: payload }).lean();

exports.removeCourseSlot = async courseSlotId => CourseSlot.deleteOne({ _id: courseSlotId });
