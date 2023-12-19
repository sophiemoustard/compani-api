const Boom = require('@hapi/boom');
const Course = require('../../models/Course');
const TrainerMission = require('../../models/TrainerMission');
const translate = require('../../helpers/translate');

const { language } = translate;

exports.authorizeTrainerMissionCreation = async (req) => {
  const { trainer, courses } = req.payload;
  const coursesId = Array.isArray(courses) ? courses : [courses];

  const coursesCount = await Course.countDocuments({ _id: { $in: coursesId }, trainer });
  if (coursesCount !== coursesId.length) throw Boom.notFound();

  const trainerMission = await TrainerMission.countDocuments({ courses: { $in: coursesId } });
  if (trainerMission) throw Boom.conflict(translate[language].trainerMissionAlreadyExist);

  return null;
};
