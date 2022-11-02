const Boom = require('@hapi/boom');
const Step = require('../../models/Step');
const Activity = require('../../models/Activity');
const Program = require('../../models/Program');
const { PUBLISHED, E_LEARNING } = require('../../helpers/constants');
const { CompaniDuration } = require('../../helpers/dates/companiDurations');

exports.authorizeStepUpdate = async (req) => {
  const step = await Step.findOne({ _id: req.params._id }, { activities: 1, status: 1 }).lean();
  if (!step) throw Boom.notFound();
  if (step.status === PUBLISHED &&
    Object.keys(req.payload).some(key => !['name', 'theoreticalDuration'].includes(key))) {
    throw Boom.forbidden();
  }

  const { activities, theoreticalDuration } = req.payload;
  if (activities) {
    const lengthAreEquals = step.activities.length === activities.length;
    const dbActivitiesAreInPayload = step.activities.every(value => activities.includes(value.toHexString()));
    if (!lengthAreEquals || !dbActivitiesAreInPayload) return Boom.badRequest();
  }

  if (!!theoreticalDuration && CompaniDuration(theoreticalDuration).asSeconds() <= 0) throw Boom.badRequest();

  return null;
};

exports.authorizeActivityAddition = async (req) => {
  const step = await Step.findOne({ _id: req.params._id }, { status: 1, type: 1 }).lean();
  if (!step) throw Boom.notFound();
  if (step.status === PUBLISHED || step.type !== E_LEARNING) throw Boom.forbidden();

  return null;
};

exports.authorizeActivityReuse = async (req) => {
  const step = await Step.findOne({ _id: req.params._id }, { activities: 1, status: 1, type: 1 }).lean();
  if (!step) throw Boom.notFound();
  if (step.status === PUBLISHED || step.type !== E_LEARNING) throw Boom.forbidden();

  const { activities } = req.payload;
  const existingActivity = await Activity.countDocuments({ _id: activities });
  if (!existingActivity) throw Boom.notFound();
  if (step.activities.map(a => a.toHexString()).includes(activities)) throw Boom.badRequest();

  return null;
};

exports.authorizeActivityDetachment = async (req) => {
  const step = await Step.findOne({ _id: req.params._id, activities: req.params.activityId }, { status: 1 }).lean();
  if (!step) throw Boom.notFound();
  if (step.status === PUBLISHED) throw Boom.forbidden();

  return null;
};

exports.authorizeGetStep = async (req) => {
  const program = await Program.countDocuments({ _id: req.query.program });
  if (!program) throw Boom.notFound();

  return null;
};
