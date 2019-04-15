
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
      // throw new Error(`Error while getting customers: ${result.data.message}`);
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

const getCustomerServices = async (req) => {
  try {
    let servicesRaw = {};
    if ((req.query.isRange && req.query.slotToSub && req.query.slotToAdd && req.query.intervalType)
    || (req.query.isDate && req.query.startDate && req.query.endDate)) {
      const params = req.query;
      params.token = req.headers['x-ogust-token'];
      params.id_customer = req.params.id;
      servicesRaw = await customers.getServices(params);
    } else {
      return Boom.badRequest();
    }
    if (servicesRaw.data.status == 'KO') {
      return Boom.badRequest(servicesRaw.data.message);
    } else if (servicesRaw.length === 0) {
      return Boom.notFound();
    }
    return {
      message: translate[language].ogustServicesFound,
      data: { servicesRaw: servicesRaw.data }
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

const getThirdPartyInformation = async (req) => {
  try {
    const params = req.query;
    params.token = req.headers['x-ogust-token'];
    params.third_party_id = req.params.id;
    const thirdPartyInfos = await customers.getThirdPartyInformationByCustomerId(params);
    if (thirdPartyInfos.data.status == 'KO') {
      return Boom.badRequest(thirdPartyInfos.data.message);
    } else if (thirdPartyInfos.length === 0) {
      return Boom.notFound();
    }
    return {
      message: translate[language].thirdPartyInfoFound,
      data: { info: thirdPartyInfos.data }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const editThirdPartyInformation = async (req) => {
  try {
    const params = req.query;
    params.token = req.headers['x-ogust-token'];
    params.third_party_id = req.params.id;
    params.array_values = req.payload.arrayValues;
    const thirdPartyInfos = await customers.editThirdPartyInformationByCustomerId(params);
    if (thirdPartyInfos.data.status == 'KO') {
      return Boom.badRequest(thirdPartyInfos.data.message);
    }
    return {
      message: translate[language].thirdPartyInfoEdited,
      data: { info: thirdPartyInfos.data }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const getCustomerContacts = async (req) => {
  try {
    const params = {
      token: req.headers['x-ogust-token'],
      id_customer: req.params.id
    };
    const contactsRaw = await customers.getContacts(params);
    if (contactsRaw == 'KO') {
      return Boom.badRequest(contactsRaw.data.message);
    }
    return {
      message: translate[language].contactsFound,
      data: { contacts: contactsRaw.data }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};


module.exports = {
  list,
  getById,
  getCustomerServices,
  getThirdPartyInformation,
  editThirdPartyInformation,
  updateById,
  create,
  getCustomerContacts
};
