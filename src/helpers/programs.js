const flat = require('flat');
const { get } = require('lodash');
const Course = require('../models/Course');
const Program = require('../models/Program');
const GCloudStorageHelper = require('./gCloudStorage');
const { STRICTLY_E_LEARNING } = require('./constants');

exports.createProgram = async payload => Program.create(payload);

exports.list = async () => Program.find({})
  .populate({ path: 'subPrograms', select: 'name' })
  .lean();

exports.listELearning = async (credentials) => {
  const eLearningCourse = await Course.find(
    { format: STRICTLY_E_LEARNING, $or: [{ accessRules: [] }, { accessRules: get(credentials, 'company._id') }] }
  )
    .lean();
  const subPrograms = eLearningCourse.map(course => course.subProgram);

  return Program.find({ subPrograms: { $in: subPrograms } })
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

exports.getProgram = async (programId) => {
  const program = await Program.findOne({ _id: programId })
    .populate({ path: 'subPrograms', populate: { path: 'steps', populate: { path: 'activities', populate: 'cards' } } })
    .populate({ path: 'categories' })
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

exports.updateProgram = async (programId, payload) => Program.updateOne({ _id: programId }, { $set: payload });

exports.uploadImage = async (programId, payload) => {
  const imageUploaded = await GCloudStorageHelper.uploadProgramMedia(payload);

  await Program.updateOne({ _id: programId }, { $set: flat({ image: imageUploaded }) });
};

exports.deleteImage = async (programId, publicId) => {
  if (!publicId) return;

  await Program.updateOne({ _id: programId }, { $unset: { 'image.publicId': '', 'image.link': '' } });
  await GCloudStorageHelper.deleteProgramMedia(publicId);
};

exports.addCategory = async (programId, payload) =>
  Program.updateOne({ _id: programId }, { $push: { categories: payload.categoryId } });

exports.removeCategory = async (programId, categoryId) =>
  Program.updateOne({ _id: programId }, { $pull: { categories: categoryId } });
