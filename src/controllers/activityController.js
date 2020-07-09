const Boom = require('@hapi/boom');
const ActivityHelper = require('../helpers/activities');
const translate = require('../helpers/translate');

const { language } = translate;

const update = async (req) => {
  try {
    const activity = await ActivityHelper.updateActivity(req.params._id, req.payload);

    return {
      message: translate[language].activityUpdated,
      data: { activity },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = {
  update,
};
