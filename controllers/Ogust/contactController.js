const Boom = require('boom');

const translate = require('../../helpers/translate');
const contacts = require('../../models/Ogust/Contact');

const { language } = translate;

const list = async (req) => {
  try {
    const params = req.query;
    params.token = req.headers['x-ogust-token'];
    const users = await contacts.getContacts(params);
    if (users.data.status == 'KO') {
      return Boom.badRequest(users.data.message);
      // throw new Error(`Error while getting customers: ${result.data.message}`);
    } else if (Object.keys(users.data.array_contact.result).length === 0) {
      return Boom.notFound();
    }
    return {
      message: translate[language].userShowAllFound,
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
    const user = await contacts.setContact(params);
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
    const user = await contacts.setContact(params);
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

const deleteById = async (req) => {
  try {
    const params = {
      id_interloc: req.params.id,
      token: req.headers['x-ogust-token']
    };
    const contactDeleted = await contacts.deleteContact(params);
    if (contactDeleted.data.status == 'KO') {
      return Boom.badRequest(contactDeleted.data.message);
    }
    return {
      message: translate[language].userRemoved
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

module.exports = {
  list,
  updateById,
  create,
  deleteById
};
