const Boom = require('@hapi/boom');
const ActivityHelper = require('../helpers/activities');
const translate = require('../helpers/translate');

const { language } = translate;

const addActivity = async (req) => {
  try {
    const module = await ActivityHelper.addActivity(req.params._id, req.payload);

    return {
      message: translate[language].programUpdated,
      data: { module },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = {
  addActivity,
};
