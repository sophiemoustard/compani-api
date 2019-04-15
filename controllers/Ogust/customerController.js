
const Boom = require('boom');

const translate = require('../../helpers/translate');
const customers = require('../../models/Ogust/Customer');

const { language } = translate;

const list = async (req) => {
  try {
    const params = req.query;
    params.token = req.headers['x-ogust-token'];
    const users = await customers.getCustomers(params);
    if (users.data.status == 'KO') {
      return Boom.badRequest(users.data.message);
    } else if (Object.keys(users.data.array_customer.result).length === 0) {
      return Boom.notFound();
    }
    return {
      message: translate[language].userShowAllFound,
      data: { customers: users.data }
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
      id_customer: req.params.id
    };
    const user = await customers.getCustomerById(params);
    if (user.data.status == 'KO') {
      return Boom.badRequest(user.data.message);
    } else if (Object.keys(user.data.customer).length === 0) {
      return Boom.notFound();
    }
    return {
      message: translate[language].userFound,
      data: { user: user.data }
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
    params.id_customer = req.params.id;
    const user = await customers.editCustomerById(params);
    if (user.data.status == 'KO') {
      return Boom.badRequest(user.data.message);
    }
    return {
      message: translate[language].userSaved,
      data: user.data
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
    const user = await customers.editCustomerById(params);
    if (user.data.status == 'KO') {
      return Boom.badRequest(user.data.message);
    }
    return {
      message: translate[language].userCreated,
      data: user.data
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

module.exports = {
  list,
  getById,
  updateById,
  create,
};
