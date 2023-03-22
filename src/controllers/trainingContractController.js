const Boom = require('@hapi/boom');
const TrainingContractsHelper = require('../helpers/trainingContracts');
const translate = require('../helpers/translate');

const { language } = translate;

const create = async (req) => {
  try {
    await TrainingContractsHelper.create(req.payload);

    return { message: translate[language].trainingContractCreated };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { create };
