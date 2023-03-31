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

const list = async (req) => {
  try {
    const trainingContracts = await TrainingContractsHelper.list(req.query.course, req.auth.credentials);

    return {
      message: trainingContracts.length
        ? translate[language].trainingContractsFound
        : translate[language].trainingContractsNotFound,
      data: { trainingContracts },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const remove = async (req) => {
  try {
    await TrainingContractsHelper.delete(req.params._id);

    return { message: translate[language].trainingContractDeleted };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { create, list, remove };
