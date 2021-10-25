const { pick } = require('lodash');
const Step = require('../models/Step');
const SubProgram = require('../models/SubProgram');
const moment = require('../extensions/moment');
const UtilsHelper = require('./utils');
const { E_LEARNING } = require('./constants');

const LIVE_PROGRESS_WEIGHT = 0.9;

exports.updateStep = async (stepId, payload) => Step.updateOne({ _id: stepId }, { $set: payload });

exports.addStep = async (subProgramId, payload) => {
  const step = await Step.create(payload);
  await SubProgram.updateOne({ _id: subProgramId }, { $push: { steps: step._id } });
};

exports.reuseActivity = async (stepId, payload) =>
  Step.updateOne({ _id: stepId }, { $push: { activities: payload.activities } });

exports.detachStep = async (subProgramId, stepId) =>
  SubProgram.updateOne({ _id: subProgramId }, { $pull: { steps: stepId } });

exports.elearningStepProgress = (step) => {
  const progress = step.activities.filter(activity => activity.activityHistories.length > 0).length;
  const maxProgress = step.activities.length;

  return maxProgress ? progress / maxProgress : 0;
};

exports.liveStepProgress = (step, slots) => {
  const nextSlots = slots.filter(slot => moment().isSameOrBefore(slot.endDate));
  const liveProgress = slots.length ? 1 - nextSlots.length / slots.length : 0;

  return step.activities.length
    ? parseFloat((liveProgress * LIVE_PROGRESS_WEIGHT
        + exports.elearningStepProgress(step) * (1 - LIVE_PROGRESS_WEIGHT)).toFixed(2))
    : liveProgress;
};

exports.getProgress = (step, slots) => (step.type === E_LEARNING
  ? exports.elearningStepProgress(step)
  : exports.liveStepProgress(step, slots.filter(slot => UtilsHelper.areObjectIdsEquals(slot.step._id, step._id))));

exports.list = async (programId) => {
  const steps = await Step.find({})
    .populate({ path: 'subPrograms', select: 'program -steps', populate: { path: 'program', select: '_id' } })
    .lean();

  return steps
    .filter(step => step.subPrograms.find(subProgram =>
      subProgram.program && UtilsHelper.areObjectIdsEquals(subProgram.program._id, programId)))
    .map(step => pick(step, ['_id', 'name', 'type']));
};
