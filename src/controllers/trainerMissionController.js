const Boom = require('@hapi/boom');
const TrainerMissionsHelper = require('../helpers/trainerMissions');
const translate = require('../helpers/translate');

const { language } = translate;

const create = async (req) => {
  try {
    await TrainerMissionsHelper.uploadTrainerMission(req.payload, req.auth.credentials);

    return { message: translate[language].trainerMissionCreated };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { create };
