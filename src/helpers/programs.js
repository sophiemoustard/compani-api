const flat = require('flat');
const Course = require('../models/Course');
const Program = require('../models/Program');
const GCloudStorageHelper = require('./gCloudStorage');
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

exports.getProgramForUser = async (programId, credentials) => {
  const eLearningCourse = await Course.find({ format: STRICTLY_E_LEARNING }).lean();
  const subPrograms = eLearningCourse.map(course => course.subProgram);

  return Program.findOne({ _id: programId })
    .populate({
      path: 'subPrograms',
      select: 'name',
      match: { _id: { $in: subPrograms } },
      populate: [
        { path: 'courses', select: '_id trainees', match: { format: STRICTLY_E_LEARNING } },
        {
          path: 'steps',
          select: 'activities',
          populate: {
            path: 'activities',
            select: 'activityHistories',
            populate: { path: 'activityHistories', match: { user: credentials._id } },
          },
        },
      ],
    })
    .lean();
};

exports.updateProgram = async (programId, payload) => Program.updateOne({ _id: programId }, { $set: payload });

exports.uploadImage = async (programId, payload) => {
  const fileName = GCloudStorageHelper.formatFileName(payload.fileName);
  const imageUploaded = await GCloudStorageHelper.uploadMedia({ fileName, file: payload.file });

  await Program.updateOne({ _id: programId }, { $set: flat({ image: { publicId: fileName, link: imageUploaded } }) });
};

exports.deleteImage = async (programId, publicId) => {
  if (!publicId) return;

  await Program.updateOne({ _id: programId }, { $unset: { 'image.publicId': '', 'image.link': '' } });
  await GCloudStorageHelper.deleteMedia(publicId);
};
