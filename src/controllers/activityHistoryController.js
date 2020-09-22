const Boom = require('@hapi/boom');
const ActivityHistoryHelper = require('../helpers/activityHistories');
const translate = require('../helpers/translate');

const { language } = translate;

const addActivityHistory = async (req) => {
  try {
    await ActivityHistoryHelper.addActivityHistory(req.payload);

    return { message: translate[language].activityHistoryCreated };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = {
  addActivityHistory,
};
