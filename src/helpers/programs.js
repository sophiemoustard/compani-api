const flat = require('flat');
const moment = require('moment');
const Course = require('../models/Course');
const Program = require('../models/Program');
const CloudinaryHelper = require('./cloudinary');
const { STRICTLY_E_LEARNING } = require('./constants');

exports.createProgram = payload => (new Program(payload)).save();

exports.list = async () => Program.find({})
  .populate({ path: 'subPrograms', select: 'name' })
  .lean();

exports.listELearning = async () => {
  const eLearningCourse = await Course.find({ format: STRICTLY_E_LEARNING }).lean();
  const subPrograms = eLearningCourse.map(course => course.subProgram);

  return Program.find({ subPrograms: { $in: subPrograms } })
    .populate({
      path: 'subPrograms',
      select: 'name',
      match: { _id: { $in: subPrograms } },
      populate: {
        path: 'courses',
        select: '_id trainees',
        match: { format: STRICTLY_E_LEARNING },
      },
    })
    .lean();
};

exports.getProgram = async (programId) => {
  const program = await Program.findOne({ _id: programId })
    .populate({ path: 'subPrograms', populate: { path: 'steps', populate: { path: 'activities', populate: 'cards' } } })
    .lean({ virtuals: true });

  return {
    ...program,
    subPrograms: program.subPrograms.map(sp => ({
      ...sp,
      steps: sp.steps.map(st => ({
        ...st,
        activities: st.activities.map(act => ({ ...act, cards: act.cards.map(c => c._id) })),
      })),
    })),
  };
};

exports.getProgramForUser = async (programId) => {
  const eLearningCourse = await Course.find({ format: STRICTLY_E_LEARNING }).lean();
  const subPrograms = eLearningCourse.map(course => course.subProgram);

  return Program.findOne({ _id: programId })
    .populate({
      path: 'subPrograms',
      select: 'name',
      match: { _id: { $in: subPrograms } },
      populate: [
        { path: 'courses', select: '_id trainees', match: { format: STRICTLY_E_LEARNING } },
        { path: 'steps', select: 'activities' },
      ],
    })
    .lean();
};

exports.updateProgram = async (programId, payload) => Program.updateOne({ _id: programId }, { $set: payload });

exports.uploadImage = async (programId, payload) => {
  const imageUploaded = await CloudinaryHelper.addImage({
    file: payload.file,
    folder: 'images/business/Compani/programs',
    public_id: `${payload.fileName}-${moment().format('YYYY_MM_DD_HH_mm_ss')}`,
  });

  const updatePayload = {
    image: {
      publicId: imageUploaded.public_id,
      link: imageUploaded.secure_url,
    },
  };
  await Program.updateOne({ _id: programId }, { $set: flat(updatePayload) });
};
