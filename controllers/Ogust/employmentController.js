// const moment = require('moment');
const Boom = require('boom');

const translate = require('../../helpers/translate');
const employment = require('../../models/Ogust/Employment');

const { language } = translate;

const list = async (req) => {
  try {
    const params = req.query;
    params.token = req.headers['x-ogust-token'];
    const contracts = await employment.getEmploymentContracts(params);
    if (contracts.data.status == 'KO') {
      return Boom.badRequest(contracts.data.message);
    } else if (Object.keys(contracts.data.array_employment.result).length === 0) {
      return Boom.notFound();
    }
    return {
      message: translate[language].employmentContractShowAllFound,
      data: { contracts: contracts.data }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const getById = async (req) => {
  try {
    const params = {
      token: req.headers['x-ogust-token'],
      id_contract: req.params.id
    };
    const contract = await employment.getEmploymentContracts(params);
    if (contract.data.status == 'KO') {
      return Boom.badRequest(contract.data.message);
    } else if (Object.keys(contract.data.employment).length === 0) {
      return Boom.notFound();
    }
    return {
      message: translate[language].employmentContractFound,
      data: { contract: contract.data }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const create = async (req) => {
  try {
    const params = req.payload;
    params.token = req.headers['x-ogust-token'];
    const contract = await employment.createEmploymentContract(params);
    return {
      message: translate[language].employmentContractCreated,
      data: contract.data
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const updateById = async (req) => {
  try {
    const params = req.payload;
    params.token = req.headers['x-ogust-token'];
    params.id_employee = req.params.id;
    const contract = await employment.createEmploymentContract(params);
    if (contract.data.status == 'KO') {
      return Boom.badRequest(contract.data.message);
    }
    return {
      message: translate[language].employmentContractSaved,
      data: contract.data
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};


module.exports = {
  list,
  getById,
  create,
  updateById
};
