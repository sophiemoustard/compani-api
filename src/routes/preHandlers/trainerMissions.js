const Boom = require('@hapi/boom');
const Course = require('../../models/Course');
const TrainerMission = require('../../models/TrainerMission');

exports.authorizeTrainerMissionUpload = async (req) => {
  const { trainer } = req.payload;
  const coursesId = Array.isArray(req.payload.courses) ? req.payload.courses : [req.payload.courses];
  const courses = await Course.countDocuments({ _id: { $in: coursesId }, trainer });
  if (courses !== coursesId.length) throw Boom.notFound();

  const trainerMission = await TrainerMission.countDocuments({ courses: { $in: coursesId } });
  if (trainerMission) throw Boom.conflict();

  return null;
};
