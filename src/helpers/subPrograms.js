const Program = require('../models/Program');
const SubProgram = require('../models/SubProgram');
const Step = require('../models/Step');
const Activity = require('../models/Activity');

exports.addSubProgram = async (programId, payload) => {
  const subProgram = await SubProgram.create(payload);
  await Program.updateOne({ _id: programId }, { $push: { subPrograms: subProgram._id } });
};

exports.updateSubProgram = async (subProgramId, payload) => {
  if (!payload.status) return SubProgram.updateOne({ _id: subProgramId }, { $set: payload });

  const subProgram = await SubProgram
    .findOneAndUpdate({ _id: subProgramId }, { $set: payload })
    .populate({ path: 'steps', select: 'activities' })
    .lean();

  await Step.updateMany({ _id: { $in: subProgram.steps.map(step => step._id) } }, { status: payload.status });
  const activities = subProgram.steps.map(step => step.activities).flat();
  return Activity.updateMany({ _id: { $in: activities } }, { status: payload.status });
};
