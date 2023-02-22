const Boom = require('@hapi/boom');
const StepsHelper = require('../helpers/steps');
const ActivityHelper = require('../helpers/activities');
const translate = require('../helpers/translate');

const { language } = translate;

const update = async (req) => {
  try {
    await StepsHelper.updateStep(req.params._id, req.payload);

    return { message: translate[language].stepUpdated };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const addActivity = async (req) => {
  try {
    await ActivityHelper.addActivity(req.params._id, req.payload);

    return { message: translate[language].stepUpdated };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const reuseActivity = async (req) => {
  try {
    await StepsHelper.reuseActivity(req.params._id, req.payload);

    return { message: translate[language].stepUpdated };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const detachActivity = async (req) => {
  try {
    await ActivityHelper.detachActivity(req.params._id, req.params.activityId);

    return { message: translate[language].activityDetached };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const list = async (req) => {
  try {
    const steps = await StepsHelper.list(req.query.program);

    return { data: { steps }, message: translate[language].stepsFound };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = {
  update,
  addActivity,
  reuseActivity,
  detachActivity,
  list,
};
