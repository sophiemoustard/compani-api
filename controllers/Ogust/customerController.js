
const Boom = require('boom');

const translate = require('../../helpers/translate');
const customers = require('../../models/Ogust/Customer');

const { language } = translate;

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
  getById,
  create,
};
