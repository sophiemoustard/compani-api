const Boom = require('@hapi/boom');
const TrainerMissionsHelper = require('../helpers/trainerMissions');
const translate = require('../helpers/translate');

const { language } = translate;

const create = async (req, h) => {
  try {
    if (req.payload.file) await TrainerMissionsHelper.upload(req.payload, req.auth.credentials);
    else {
      const { pdf, fileName } = await TrainerMissionsHelper.generate(req.payload, req.auth.credentials);
      return h.response(pdf)
        .header('content-disposition', `inline; filename=${fileName}.pdf`)
        .type('application/pdf');
    }

    return { message: translate[language].trainerMissionCreated };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const list = async (req) => {
  try {
    const trainerMissions = await TrainerMissionsHelper.list(req.query, req.auth.credentials);

    return {
      message: trainerMissions.length
        ? translate[language].trainerMissionsFound
        : translate[language].trainerMissionsNotFound,
      data: { trainerMissions },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { create, list };
