const Boom = require('@hapi/boom');
const ActivityHelper = require('../helpers/activities');
const translate = require('../helpers/translate');

const { language } = translate;

const update = async (req) => {
  try {
    await ActivityHelper.updateActivity(req.params._id, req.payload);

    return {
      message: translate[language].activityUpdated,
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = {
  update,
};
