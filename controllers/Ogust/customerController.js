const translate = require('../../helpers/translate');
const customers = require('../../models/Ogust/Customer');
const { redirectToBot } = require('../../models/Bot/bot');
const _ = require('lodash');

const language = translate.language;

const getAll = async (req, res) => {
  try {
    console.log(req);
    const params = {
      token: req.headers['x-ogust-token'],
      email: req.query.email || '',
      status: req.query.status || 'A',
      last_name: req.query.lastName || '',
      sector: req.query.sector || '',
      nbperpage: req.query.nbperpage || 50,
      pagenum: req.query.pagenum || 1
    };
    const newParams = _.pickBy(params);
    const users = await customers.getCustomers(newParams);
    if (users.body.status == 'KO') {
      res.status(400).json({ success: false, message: users.body.message });
      // throw new Error(`Error while getting employees: ${result.body.message}`);
    } else if (users.length === 0) {
      res.status(404).json({ success: false, message: translate[language].userShowAllNotFound });
    } else {
      res.status(200).json({ success: true, message: translate[language].userShowAllFound, data: { users: users.body } });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

const getById = async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({ success: false, message: translate[language].missingParameters });
    }
    const params = {
      token: req.headers['x-ogust-token'],
      id_customer: req.params.id
    };
    const newParams = _.pickBy(params);
    const user = await customers.getCustomerById(newParams);
    if (user.body.status == 'KO') {
      res.status(400).json({ success: false, message: user.body.message });
    } else if (user.length === 0) {
      res.status(404).json({ success: false, message: translate[language].userNotFound });
    } else {
      res.status(200).json({ success: true, message: translate[language].userFound, data: { user: user.body } });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

const editCustomer = async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({ success: false, message: translate[language].missingParameters });
    }
    const params = {
      token: req.headers['x-ogust-token'],
      id_customer: req.params.id,
      door_code: req.body.doorCode || '',
      intercom_code: req.body.interCode || '',
      first_name: req.body.first_name || '',
      last_name: req.body.last_name || '',
      email: req.body.email || '',
      mobile_phone: req.body.mobile_phone || '',
      landline: req.body.landline || ''
    };
    const newParams = _.pickBy(params);
    const user = await customers.editCustomerById(newParams);
    if (user.body.status == 'KO') {
      res.status(400).json({ success: false, message: user.body.message });
    } else if (user.length === 0) {
      res.status(404).json({ success: false, message: translate[language].userNotFound });
    } else {
      res.status(200).json({ success: true, message: translate[language].customerCodesModified, data: { user: user.body } });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

const getCustomerServices = async (req, res) => {
  try {
    let servicesRaw = {};
    if (!req.params.id) {
      return res.status(400).json({ success: false, message: translate[language].missingParameters });
    }
    if ((req.query.isRange == 'true' && req.query.slotToSub && req.query.slotToAdd && req.query.intervalType)
    || (req.query.isDate == 'true' && req.query.startDate && req.query.endDate)) {
      const params = {
        token: req.headers['x-ogust-token'],
        id_customer: req.params.id,
        isRange: req.query.isRange || false,
        isDate: req.query.isDate || false,
        slotToSub: req.query.slotToSub || '',
        slotToAdd: req.query.slotToAdd || '',
        intervalType: req.query.intervalType || '',
        startDate: req.query.startDate || '',
        endDate: req.query.endDate || '',
        status: req.query.status || '@!=|N',
        type: req.query.type || 'I',
        nbperpage: req.query.nbPerPage || '100',
        pagenum: req.query.pageNum || '1'
      };
      const newParams = _.pickBy(params);
      servicesRaw = await customers.getServices(newParams);
    } else {
      return res.status(400).json({ success: false, message: translate[language].missingParameters });
    }
    if (servicesRaw.body.status == 'KO') {
      res.status(400).json({ success: false, message: servicesRaw.body.message });
    } else if (servicesRaw.length === 0) {
      res.status(404).json({ success: false, message: translate[language].servicesNotFound });
    } else {
      res.status(200).json({ success: true, message: translate[language].servicesFound, data: { servicesRaw: servicesRaw.body } });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

const getThirdPartyInformation = async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({ success: false, message: translate[language].missingParameters });
    }
    const params = {
      token: req.headers['x-ogust-token'],
      third_party_id: req.params.id,
      third_party: req.query.third_party || 'C',
      nbperpage: req.query.nbperpage || 10,
      pagenum: req.query.pagenum || 1
    };
    const newParams = _.pickBy(params);
    const thirdPartyInfos = await customers.getThirdPartyInformationByCustomerId(newParams);
    if (thirdPartyInfos.body.status == 'KO') {
      res.status(400).json({ success: false, message: thirdPartyInfos.body.message });
    } else if (thirdPartyInfos.length === 0) {
      res.status(404).json({ success: false, message: translate[language].thirdPartyInfoNotFound });
    } else {
      res.status(200).json({ success: true, message: translate[language].thirdPartyInfoFound, data: { info: thirdPartyInfos.body } });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

const getCustomerFiscalAttests = async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({ success: false, message: translate[language].missingParameters });
    }
    const params = {
      token: req.headers['x-ogust-token'],
      id_customer: req.params.id,
      status: 'E',
      period_end: req.query.year ? `@between|${req.query.year}0101|${req.query.year}1231` : '',
      nbperpage: req.query.nbPerPage || '24',
      pagenum: req.query.pageNum || '1'
    };
    const newParams = _.pickBy(params);
    const fiscalAttestsRaw = await customers.getFiscalAttests(newParams);
    if (fiscalAttestsRaw.body.status == 'KO') {
      return res.status(400).json({ success: false, message: fiscalAttestsRaw.body.message });
    } else if (Object.keys(fiscalAttestsRaw.body.array_fiscalattest.result).length === 0) {
      return res.status(404).json({ success: false, message: translate[language].fiscalAttestsNotFound });
    }
    return res.status(200).json({ success: true, message: translate[language].fiscalAttestsFound, data: { fiscalAttests: fiscalAttestsRaw.body } });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

const getCustomerInvoices = async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({ success: false, message: translate[language].missingParameters });
    }
    const params = {
      token: req.headers['x-ogust-token'],
      id_customer: req.params.id,
      status: 'E',
      nbperpage: req.query.nbPerPage || '50',
      pagenum: req.query.pageNum || '1'
    };
    if (req.query.startPeriod && req.query.endPeriod) {
      params.end_of_period = `@between|${req.query.startPeriod}|${req.query.endPeriod}`;
    } else if (req.query.year && req.query.month) {
      params.end_of_period = `@between|${req.query.year}${req.query.month}01|${req.query.year}${req.query.month}31`;
    } else {
      params.end_of_period = `@between|${req.query.year}0101|${req.query.year}1231`;
    }
    const newParams = _.pickBy(params);
    const invoicesRaw = await customers.getInvoices(newParams);
    if (invoicesRaw.body.status == 'KO') {
      return res.status(400).json({ success: false, message: invoicesRaw.body.message });
    } else if (Object.keys(invoicesRaw.body.array_invoice.result).length === 0) {
      return res.status(404).json({ success: false, message: translate[language].invoicesNotFound });
    }
    return res.status(200).json({ success: true, message: translate[language].invoicesFound, data: { invoices: invoicesRaw.body } });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

const editThirdPartyInformation = async (req, res) => {
  try {
    if (!req.params.id || !req.body.arrayValues) {
      return res.status(400).json({ success: false, message: translate[language].missingParameters });
    }
    const params = {
      token: req.headers['x-ogust-token'],
      third_party_id: req.params.id,
      third_party: req.query.third_party || 'C',
      array_values: req.body.arrayValues
    };
    const newParams = _.pickBy(params);
    const thirdPartyInfos = await customers.editThirdPartyInformationByCustomerId(newParams);
    if (thirdPartyInfos.body.status == 'KO') {
      res.status(400).json({ success: false, message: thirdPartyInfos.body.message });
    } else {
      // if (req.query.address) {
      //   await redirectToBot(req.query.address);
      // }
      res.status(200).json({ success: true, message: translate[language].thirdPartyInfoEdited, data: { info: thirdPartyInfos.body } });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

const getCustomerContacts = async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({ success: false, message: translate[language].missingParameters });
    }
    console.log('qwdq');
    const params = {
      token: req.headers['x-ogust-token'],
      id_customer: req.params.id
    };
    const contactsRaw = await customers.getContacts(params);
    if (contactsRaw == 'KO') {
      res.status(400).json({ success: false, message: contactsRaw.body.message });
    } else {
      res.status(200).json({ success: true, message: translate[language].contactsFound, data: { contacts: contactsRaw.body } });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

module.exports = {
  getAll,
  getById,
  getCustomerServices,
  getThirdPartyInformation,
  getCustomerFiscalAttests,
  getCustomerInvoices,
  editThirdPartyInformation,
  editCustomer,
  getCustomerContacts
};
