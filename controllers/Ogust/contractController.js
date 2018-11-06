const Boom = require('boom');

const translate = require('../../helpers/translate');
const contracts = require('../../models/Ogust/Contract');

const { language } = translate;

const create = async (req) => {
  try {
    const params = req.payload;
    params.token = req.headers['x-ogust-token'];
    const user = await contracts.editContractById(params);
    if (user.data.status == 'KO') {
      return Boom.badRequest(user.data.message);
    }
    return {
      message: translate[language].userContractAdded,
      data: user.data
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const list = async (req) => {
  try {
    const params = req.query;
    params.token = req.headers['x-ogust-token'];
    const users = await contracts.listContracts(params);
    if (users.data.status == 'KO') {
      return Boom.badRequest(users.data.message);
    }
    return {
      message: translate[language].userContractsFound,
      data: { contacts: users.data }
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
    params.id_contract = req.params.id;
    const user = await contracts.editContractById(params);
    if (user.data.status == 'KO') {
      return Boom.badRequest(user.data.message);
    }
    return {
      message: translate[language].userContractUpdated,
      data: user.data
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const removeById = async (req) => {
  try {
    const params = req.payload;
    params.token = req.headers['x-ogust-token'];
    const user = await contracts.removeContractById(params);
    if (user.data.status == 'KO') {
      return Boom.badRequest(user.data.message);
    }
    return {
      message: translate[language].userContractRemoved,
      data: user.data
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

module.exports = {
  create,
  list,
  updateById,
  removeById
};
