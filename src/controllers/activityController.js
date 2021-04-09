const Boom = require('@hapi/boom');
const ActivityHelper = require('../helpers/activities');
const translate = require('../helpers/translate');

const { language } = translate;

const getById = async (req) => {
  try {
    const activity = await ActivityHelper.getActivity(req.params._id);

    return {
      message: translate[language].activityFound,
      data: { activity },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const update = async (req) => {
  try {
    await ActivityHelper.updateActivity(req.params._id, req.payload);

    return { message: translate[language].activityUpdated };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const addCard = async (req) => {
  try {
    await ActivityHelper.addCard(req.params._id, req.payload);

    return { message: translate[language].activityUpdated };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const removeCard = async (req) => {
  try {
    await ActivityHelper.removeCard(req.params.cardId);

    return { message: translate[language].cardDeleted };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { getById, update, addCard, removeCard };
