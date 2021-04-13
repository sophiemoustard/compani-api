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

const list = async (req) => {
  try {
    const activityHistories = await ActivityHistoryHelper.list(req.query, req.auth.credentials);

    return { message: translate[language].activityHistoriesFound, data: { activityHistories } };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { addActivityHistory, list };
