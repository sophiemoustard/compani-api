const moment = require('moment');
const flat = require('flat');
const Boom = require('boom');

const translate = require('../../helpers/translate');
const employees = require('../../models/Ogust/Employee');
const customers = require('../../models/Ogust/Customer');
const Counter = require('../../models/idNumber');

const _ = require('lodash');

const { language } = translate;

const list = async (req) => {
  try {
    const params = req.query;
    params.token = req.headers['x-ogust-token'];
    const users = await employees.getEmployees(params);
    if (users.data.status == 'KO') {
      return Boom.badRequest(users.data.message);
      // throw new Error(`Error while getting employees: ${result.data.message}`);
    } else if (Object.keys(users.data.array_employee.result).length === 0) {
      return Boom.notFound();
    }
    return {
      message: translate[language].userShowAllFound,
      data: { users: users.data }
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
      id_employee: req.params.id
    };
    const user = await employees.getEmployeeById(params);
    if (user.data.status == 'KO') {
      return Boom.badRequest(user.data.message);
    } else if (Object.keys(user.data.employee).length === 0) {
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

const getEmployeeServices = async (req) => {
  try {
    let servicesRaw = {};
    if ((req.query.isRange == 'true' && req.query.slotToSub && req.query.slotToAdd && req.query.intervalType)
    || (req.query.isDate == 'true' && req.query.startDate && req.query.endDate)) {
      const params = req.query;
      params.token = req.headers['x-ogust-token'];
      params.id_employee = req.params.id;
      servicesRaw = await employees.getServices(params);
    } else {
      return Boom.badRequest();
    }
    if (servicesRaw.data.status == 'KO') {
      return Boom.badRequest(servicesRaw.data.message);
    } else if (servicesRaw.length === 0) {
      return Boom.notFound();
    }
    return {
      message: translate[language].servicesFound,
      data: { servicesRaw: servicesRaw.data }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const getEmployeeCustomers = async (req) => {
  try {
    const params = req.query;
    params.token = req.headers['x-ogust-token'];
    params.id_employee = req.params.id;
    // First we get services from Ogust by employee Id in a specific range
    const servicesInFourWeeks = await employees.getServices(params);
    if (servicesInFourWeeks.data.status == 'KO') {
      return Boom.badRequest(servicesInFourWeeks.data.message);
    }
    // Put it in a variable so it's more readable
    const servicesRawObj = servicesInFourWeeks.data.array_service.result;
    if (Object.keys(servicesRawObj).length === 0) {
      // "Il semble que tu n'aies aucune intervention de prévues d'ici 2 semaines !"
      return Boom.notFound(translate[language].servicesNotFound);
    }
    // Transform this services object into an array, then pop all duplicates by id_customer
    const servicesUniqCustomers = _.uniqBy(_.values(servicesRawObj), 'id_customer');
    // Get only id_customer properties (without '0' id_customer)
    const uniqCustomers = servicesUniqCustomers.filter((service) => {
      if (service.id_customer != 0 && service.id_customer != '271395715'
        && service.id_customer != '244566438' && service.id_customer != '286871430' && service.id_customer != '349780044'
        && service.id_customer != '356779196' && service.id_customer != '356779463' && service.id_customer != '271395715') {
        // Not Reunion Alenvi please
        return service;
      }
    }).map(service => service.id_customer); // Put it in array of id_customer
    const myRawCustomers = [];
    for (let i = 0; i < uniqCustomers.length; i++) {
      const customerParams = {
        token: req.headers['x-ogust-token'],
        id_customer: uniqCustomers[i],
        status: req.query.status || 'A',
      };
      const newCustomerParams = _.pickBy(customerParams);
      const customerRaw = await customers.getCustomerById(newCustomerParams);
      if (customerRaw.data.status == 'KO') {
        return Boom.badRequest(customerRaw.data.message);
      }
      myRawCustomers.push(customerRaw.data.customer);
    }
    return {
      message: translate[language].userShowAllFound,
      data: { customers: myRawCustomers }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const getEmployeeSalaries = async (req) => {
  try {
    const params = req.query;
    params.token = req.headers['x-ogust-token'];
    params.id_employee = req.params.id;
    const salariesRaw = await employees.getSalaries(params);
    if (salariesRaw.data.status == 'KO') {
      return Boom.badRequest(salariesRaw.data.message);
    } else if (Object.keys(salariesRaw.data.array_salary.result).length === 0) {
      return Boom.notFound(translate[language].salariesNotFound);
    }
    return {
      message: translate[language].salariesFound,
      data: { salaries: salariesRaw.data }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const create = async (req) => {
  try {
    const query = {
      idNumber: {
        prefix: `SA${moment().format('YYMM')}`
      }
    };
    const payload = {
      idNumber: { seq: 1 }
    };
    const number = await Counter.findOneAndUpdate(flat(query), { $inc: flat(payload) }, { new: true, upsert: true, setDefaultsOnInsert: true });
    const idNumber = `${number.idNumber.prefix}-${number.idNumber.seq.toString().padStart(3, '0')}`;
    const params = req.payload;
    params.token = req.headers['x-ogust-token'];
    params.number = idNumber;
    const user = await employees.createEmployee(params);
    return {
      message: translate[language].userSaved,
      data: user.data
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
    const user = await employees.createEmployee(params);
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
  getById,
  getAllBySector,
  getEmployeeServices,
  getEmployeeCustomers,
  getEmployeeSalaries,
  create,
  updateById
};
