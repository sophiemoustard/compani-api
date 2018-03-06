const translate = require('../../helpers/translate');
const employees = require('../../models/Ogust/Employee');
const customers = require('../../models/Ogust/Customer');

const _ = require('lodash');

const language = translate.language;

const getAll = async (req, res) => {
  try {
    const params = {
      token: req.headers['x-ogust-token'],
      status: req.query.status || 'A',
      nature: req.query.nature || '',
      mobile_phone: req.query.mobile_phone || '',
      sector: req.query.sector || '',
      nbperpage: req.query.nbperpage || 50,
      pagenum: req.query.pagenum || 1
    };
    const newParams = _.pickBy(params);
    const users = await employees.getEmployees(newParams);
    if (users.body.status == 'KO') {
      res.status(400).json({ success: false, message: users.body.message });
      // throw new Error(`Error while getting employees: ${result.body.message}`);
    } else if (Object.keys(users.body.array_employee.result).length === 0) {
      res.status(404).json({ success: false, message: translate[language].userShowAllNotFound });
    } else {
      res.status(200).json({ success: true, message: translate[language].userShowAllFound, data: { users: users.body } });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

const getAllBySector = async (req, res) => {
  try {
    if (!req.params.sector) {
      return res.status(400).json({ success: false, message: translate[language].missingParameters });
    }
    const params = {
      token: req.headers['x-ogust-token'],
      sector: req.params.sector,
      status: req.query.status || 'A', // status 'A' = 'Actif'
      nature: req.query.nature || 'S', // nature 'S' = 'Salarié'
      nbperpage: req.query.nbperpage,
      pagenum: req.query.pagenum
    };
    const newParams = _.pickBy(params);
    const users = await employees.getEmployeesBySector(newParams);
    if (users.body.status == 'KO') {
      res.status(400).json({ success: false, message: users.body.message });
    } else if (Object.keys(users.body.array_employee.result).length === 0) {
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
    const params = {
      token: req.headers['x-ogust-token'],
      id_employee: req.params.id
    };
    const newParams = _.pickBy(params);
    const user = await employees.getEmployeeById(newParams);
    if (user.body.status == 'KO') {
      res.status(400).json({ success: false, message: user.body.message });
    } else if (Object.keys(user.body.employee).length === 0) {
      res.status(404).json({ success: false, message: translate[language].userNotFound });
    } else {
      res.status(200).json({ success: true, message: translate[language].userFound, data: { user: user.body } });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

const getEmployeeServices = async (req, res) => {
  try {
    let servicesRaw = {};
    if (!req.params.id) {
      return res.status(400).json({ success: false, message: translate[language].missingParameters });
    }
    if ((req.query.isRange == 'true' && req.query.slotToSub && req.query.slotToAdd && req.query.intervalType)
    || (req.query.isDate == 'true' && req.query.startDate && req.query.endDate)) {
      const params = {
        token: req.headers['x-ogust-token'],
        id_employee: req.params.id,
        idCustomer: req.query.idCustomer || '',
        isRange: req.query.isRange || 'false',
        isDate: req.query.isDate || 'false',
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
      servicesRaw = await employees.getServices(newParams);
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

const getEmployeeCustomers = async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({ success: false, message: translate[language].missingParameters });
    }
    const params = {
      token: req.headers['x-ogust-token'],
      id_employee: req.params.id,
      isRange: 'true',
      isDate: 'false',
      slotToSub: req.query.slotToSub || 2,
      slotToAdd: req.query.slotToAdd || 2,
      intervalType: req.query.intervalType || 'week',
      startDate: '',
      endDate: '',
      status: req.query.status || '@!=|N',
      type: req.query.type || 'I',
      nbperpage: req.query.nbPerPage || '500',
      pagenum: req.query.pageNum || '1'
    };
    // First we get services from Ogust by employee Id in a specific range
    const newParams = _.pickBy(params);
    const servicesInFourWeeks = await employees.getServices(newParams);
    if (servicesInFourWeeks.body.status == 'KO') {
      return res.status(400).json({ success: false, message: servicesInFourWeeks.body.message });
    }
    // Put it in a variable so it's more readable
    const servicesRawObj = servicesInFourWeeks.body.array_service.result;
    if (Object.keys(servicesRawObj).length === 0) {
      // "Il semble que tu n'aies aucune intervention de prévues d'ici 2 semaines !"
      return res.status(404).json({ success: false, message: translate[language].servicesNotFound });
    }
    // Transform this services object into an array, then pop all duplicates by id_customer
    const servicesUniqCustomers = _.uniqBy(_.values(servicesRawObj), 'id_customer');
    // Get only id_customer properties (without '0' id_customer)
    const uniqCustomers = servicesUniqCustomers.filter(
      (service) => {
        if (service.id_customer != 0 && service.id_customer != '271395715'
        && service.id_customer != '244566438' && service.id_customer != '286871430' && service.id_customer != '349780044'
        && service.id_customer != '356779196' && service.id_customer != '356779463' && service.id_customer != '271395715') {
          // Not Reunion Alenvi please
          return service;
        }
      }
    ).map(service => service.id_customer); // Put it in array of id_customer
    const myRawCustomers = [];
    for (let i = 0; i < uniqCustomers.length; i++) {
      const customerParams = {
        token: req.headers['x-ogust-token'],
        id_customer: uniqCustomers[i],
        status: req.query.status || 'A',
      };
      const newCustomerParams = _.pickBy(customerParams);
      const customerRaw = await customers.getCustomerById(newCustomerParams);
      if (customerRaw.body.status == 'KO') {
        return res.status(400).json({ success: false, message: customerRaw.body.message });
      }
      myRawCustomers.push(customerRaw.body.customer);
    }
    res.status(200).json({ success: true, message: translate[language].userShowAllFound, data: { customers: myRawCustomers } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

const getEmployeeSalaries = async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({ success: false, message: translate[language].missingParameters });
    }
    const params = {
      token: req.headers['x-ogust-token'],
      id_employee: req.params.id,
      nbperpage: req.query.nbPerPage || '24',
      pagenum: req.query.pageNum || '1'
    };
    const newParams = _.pickBy(params);
    const salariesRaw = await employees.getSalaries(newParams);
    if (salariesRaw.body.status == 'KO') {
      return res.status(400).json({ success: false, message: salariesRaw.body.message });
    } else if (Object.keys(salariesRaw.body.array_salary.result).length === 0) {
      return res.status(404).json({ success: false, message: translate[language].salariesNotFound });
    }
    return res.status(200).json({ success: true, message: translate[language].salariesFound, data: { salaries: salariesRaw.body } });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

const create = async (req, res) => {
  try {
    if (!req.body.title || !req.body.last_name || !req.body.main_address) {
      return res.status(400).json({ success: false, message: translate[language].missingParameters });
    }
    const params = {
      token: req.headers['x-ogust-token'],
      title: req.body.title,
      number: req.body.number,
      last_name: req.body.last_name,
      first_name: req.body.first_name,
      main_address: {
        line: req.body.main_address.line,
        zip: req.body.main_address.zip,
        city: req.body.main_address.city,
        type: 'Adrpri',
        country: 'FR'
      },
      email: req.body.email,
      sector: req.body.sector,
      mobile_phone: req.body.mobile_phone,
      picture: req.body.picture,
      nature: 'S',
      status: 'A',
      method_of_payment: '7268',
      manager: '232220179'
    };
    const user = await employees.createEmployee(params);
    return res.status(200).json({ success: true, message: translate[language].userSaved, data: { user } });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

const updateById = async (req, res) => {
  try {
    if (!req.body || !req.params.id) {
      return res.status(400).json({ success: false, message: translate[language].missingParameters });
    }
    const params = {
      token: req.headers['x-ogust-token'],
      id_employee: req.params.id,
      last_name: req.body.last_name,
      first_name: req.body.first_name,
      email: req.body.email,
      sector: req.body.sector,
      mobile_phone: req.body.mobile_phone
    };
    const newParams = _.pickBy(params);
    const user = await employees.createEmployee(newParams);
    if (user.body.status == 'KO') {
      return res.status(400).json({ success: false, message: user.body.message });
    }
    return res.status(200).json({ success: true, message: translate[language].userSaved, data: { user } });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

module.exports = { getAll, getById, getAllBySector, getEmployeeServices, getEmployeeCustomers, getEmployeeSalaries, create, updateById };
