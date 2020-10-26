const CourseHistory = require('../models/CourseHistory');

exports.createHistoryOnSlotCreation = async payload => CourseHistory.create(payload);
