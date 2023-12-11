const Boom = require('@hapi/boom');
const Course = require('../../models/Course');
const TrainerMission = require('../../models/TrainerMission');

exports.authorizeTrainerMissionUpload = async (req) => {
  const { courses: coursesId, trainer } = req.payload;
  const courses = await Course.countDocuments({ _id: { $in: coursesId }, trainer });
  if (courses !== coursesId.length) throw Boom.notFound();

  const trainerMission = await TrainerMission.countDocuments({ courses: { $in: coursesId } });
  if (trainerMission) throw Boom.conflict();

  return null;
};
