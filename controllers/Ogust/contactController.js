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
    params.id_interloc = req.params.id;
    const user = await contacts.editContactById(params);
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

module.exports = {
  list,
  updateById
};
