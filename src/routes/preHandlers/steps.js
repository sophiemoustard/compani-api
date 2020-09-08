const Boom = require('@hapi/boom');
const Step = require('../../models/Step');
const Activity = require('../../models/Activity');

exports.authorizeStepUpdate = async (req) => {
  const step = await Step.findOne({ _id: req.params._id }).lean();
  if (!step) throw Boom.notFound();

  const { activities } = req.payload;
  if (activities) {
    const lengthAreEquals = step.activities.length === activities.length;
    const dbActivitiesAreInPayload = step.activities.every(value => activities.includes(value.toHexString()));
    const payloadActivitiesAreInDb = activities
      .every(value => step.activities.map(s => s.toHexString()).includes(value));
    if (!lengthAreEquals || !payloadActivitiesAreInDb || !dbActivitiesAreInPayload) return Boom.badRequest();
  }

  return null;
};

exports.authorizeActivityAdd = async (req) => {
  const step = await Step.countDocuments({ _id: req.params._id });
  if (!step) throw Boom.notFound();

  return null;
};

exports.authorizeActivityReuse = async (req) => {
  const step = await Step.findOne({ _id: req.params._id });
  if (!step) throw Boom.notFound();

  const { activities } = req.payload;
  const existingActivity = await Activity.countDocuments({ _id: activities });
  if (!existingActivity) throw Boom.badRequest();
  if (step.activities.map(a => a.toHexString()).includes(activities)) throw Boom.badRequest();

  return null;
};

exports.authorizeActivityDetachment = async (req) => {
  const step = await Step.findOne({ _id: req.params._id, activities: req.params.activityId }).lean();
  if (!step) throw Boom.notFound();

  return null;
};
