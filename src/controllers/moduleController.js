const Boom = require('@hapi/boom');
const ModuleHelper = require('../helpers/modules');
const ActivityHelper = require('../helpers/activities');
const translate = require('../helpers/translate');

const { language } = translate;

const update = async (req) => {
  try {
    const module = await ModuleHelper.updateModule(req.params._id, req.payload);

    return {
      message: translate[language].moduleUpdated,
      data: { module },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const addActivity = async (req) => {
  try {
    const module = await ActivityHelper.addActivity(req.params._id, req.payload);

    return {
      message: translate[language].moduleUpdated,
      data: { module },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = {
  update,
  addActivity,
};
