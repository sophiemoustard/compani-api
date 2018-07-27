const Boom = require('boom');
const _ = require('lodash');

const translate = require('../helpers/translate');
const employees = require('../models/Ogust/Employee');
const customers = require('../models/Ogust/Customer');

const { language } = translate;

const getEmployeeEvents = async (req, params) => {
  const servicesRaw = await employees.getServices(params);
  if (servicesRaw.data.status == 'KO') {
    throw Boom.badRequest(servicesRaw.data.message);
  }
  // Put it in a variable so it's more readable & remove draft status
  const events = _.filter(servicesRaw.data.array_service.result, item => item.status !== 'B');
  if (events.length === 0) {
    // "Il semble que tu n'aies aucune intervention de prévues d'ici 2 semaines !"
    throw Boom.notFound(translate[language].servicesNotFound);
  }
  const uniqCustomers = [];
  for (const index in events) {
    let isUniq = false;
    if (!_.some(uniqCustomers, ['id_customer', events[index].id_customer])) {
      isUniq = true;
      const customerParams = {
        token: req.headers['x-ogust-token'],
        id_customer: events[index].id_customer,
        status: req.query.status || 'A',
      };
      const newCustomerParams = _.pickBy(customerParams);
      const customerRaw = await customers.getCustomerById(newCustomerParams);
      const thirdPartyParams = {
        token: req.headers['x-ogust-token'],
        third_party_id: events[index].id_customer,
        third_party: 'C',
        nbperpage: 10,
        pagenum: 1
      };
      const customerThirdPartyInfosRaw = await customers.getThirdPartyInformationByCustomerId(thirdPartyParams);
      if (customerRaw.data.status == 'KO') {
        throw Boom.badRequest(customerRaw.data.message);
      }
      customerRaw.data.customer.thirdPartyInformations = customerThirdPartyInfosRaw.data.thirdPartyInformations.array_values;
      if (customerRaw.data.customer.thirdPartyInformations == null) {
        customerRaw.data.customer.thirdPartyInformations = {};
      }
      uniqCustomers.push(customerRaw.data.customer);
      events[index].customer = {
        id_customer: customerRaw.data.customer.id_customer,
        title: customerRaw.data.customer.title,
        firstname: customerRaw.data.customer.first_name,
        lastname: customerRaw.data.customer.last_name,
        door_code: customerRaw.data.customer.door_code,
        intercom_code: customerRaw.data.customer.intercom_code,
        pathology: customerRaw.data.customer.thirdPartyInformations.NIVEAU || '-',
        comments: customerRaw.data.customer.thirdPartyInformations.COMMNIV || '-',
        interventionDetails: customerRaw.data.customer.thirdPartyInformations.DETAILEVE || '-',
        misc: customerRaw.data.customer.thirdPartyInformations.AUTRESCOMM || '-'
      };
    }
    if (isUniq === false) {
      // si customer existe déja ds l'array uniqCustomers, on prends l'info de ce dernier
      const customerUncut = _.find(uniqCustomers, ['id_customer', events[index].id_customer]);
      events[index].customer = {
        id_customer: customerUncut.id_customer,
        title: customerUncut.title,
        firstname: customerUncut.first_name,
        lastname: customerUncut.last_name,
        door_code: customerUncut.door_code,
        intercom_code: customerUncut.intercom_code,
        pathology: customerUncut.thirdPartyInformations.NIVEAU || '/',
        comments: customerUncut.thirdPartyInformations.COMMNIV || '/',
        interventionDetails: customerUncut.thirdPartyInformations.DETAILEVE || '/',
        misc: customerUncut.thirdPartyInformations.AUTRESCOMM || '/'
      };
    }
  }
  return events;
};

const getCustomerEvents = async (req, params) => {
  console.log('CUSTOMER');
  const customerParams = {
    token: req.headers['x-ogust-token'],
    id_customer: params.id_customer,
    status: req.query.status || 'A',
  };
  const newCustomerParams = _.pickBy(customerParams);
  const customerRaw = await customers.getCustomerById(newCustomerParams);
  if (customerRaw.data.status == 'KO') {
    throw Boom.badRequest(customerRaw.data.message);
  }
  const thirdPartyParams = {
    token: req.headers['x-ogust-token'],
    third_party_id: params.id_customer,
    third_party: 'C',
    nbperpage: 10,
    pagenum: 1
  };
  const customerThirdPartyInfosRaw = await customers.getThirdPartyInformationByCustomerId(thirdPartyParams);
  if (customerThirdPartyInfosRaw.data.thirdPartyInformations.array_values == null) {
    customerThirdPartyInfosRaw.data.thirdPartyInformations.array_values = {};
  }
  const customerThirdPartyInfos = _.pickBy(customerThirdPartyInfosRaw.data.thirdPartyInformations.array_values);
  const servicesRaw = await customers.getServices(params);
  if (servicesRaw.data.status == 'KO') {
    throw Boom.badRequest(servicesRaw.data.message);
  }
  // Put it in a variable so it's more readable
  const events = _.filter(servicesRaw.data.array_service.result, item => item.status !== 'B');
  if (events.length === 0) {
    // "Il semble que tu n'aies aucune intervention de prévues d'ici 2 semaines !"
    throw Boom.notFound(translate[language].servicesNotFound);
  }
  const uniqEmployees = [];
  for (const index in events) {
    events[index].customer = Object.assign({
      title: customerRaw.data.customer.title,
      firstname: customerRaw.data.customer.first_name,
      lastname: customerRaw.data.customer.last_name,
      door_code: customerRaw.data.customer.door_code,
      intercom_code: customerRaw.data.customer.intercom_code
    }, {
      pathology: customerThirdPartyInfos.NIVEAU || '/',
      comments: customerThirdPartyInfos.COMMNIV || '/',
      interventionDetails: customerThirdPartyInfos.DETAILEVE || '/',
      misc: customerThirdPartyInfos.AUTRESCOMM || '/'
    });
    let isUniq = false;
    if (!_.some(uniqEmployees, ['id_employee', events[index].id_employee])) {
      isUniq = true;
      const employeeParams = {
        token: req.headers['x-ogust-token'],
        id_employee: events[index].id_employee,
        status: req.query.status || 'A',
      };
      const newEmployeeParams = _.pickBy(employeeParams);
      const employeeRaw = await employees.getEmployeeById(newEmployeeParams);
      if (employeeRaw.data.status == 'KO') {
        throw Boom.badRequest(employeeRaw.data.message);
      }
      uniqEmployees.push(employeeRaw.data.employee);
      events[index].employee = {
        id_employee: employeeRaw.data.employee.id_employee,
        title: employeeRaw.data.employee.title,
        firstname: employeeRaw.data.employee.first_name,
        lastname: employeeRaw.data.employee.last_name
      };
    }
    if (isUniq === false) {
      const employeeUncut = _.find(uniqEmployees, ['id_employee', events[index].id_employee]);
      events[index].employee = {
        id_employee: employeeUncut.id_employee,
        title: employeeUncut.title,
        firstname: employeeUncut.first_name,
        lastname: employeeUncut.last_name
      };
    }
  }
  return events;
};

const getEvents = async (req) => {
  try {
    const personType = req.query.id_employee ? 'employees' : 'customers';
    const params = {
      token: req.headers['x-ogust-token'],
      isDate: req.query.isDate || 'false',
      status: req.query.status || '@!=|N',
      startDate: req.query.startDate || '',
      endDate: req.query.endDate || '',
      type: req.query.type || 'I',
      nbperpage: req.query.nbPerPage || '500',
      pagenum: req.query.pageNum || '1'
    };
    if (req.query.id_employee) {
      params.id_employee = req.query.id_employee;
    } else if (req.query.id_customer) {
      params.id_customer = req.query.id_customer;
    }
    const newParams = _.pickBy(params);
    const events = personType === 'employees' ? await getEmployeeEvents(req, newParams) : await getCustomerEvents(req, newParams);
    return { message: translate[language].servicesFound, data: { events } };
  } catch (e) {
    req.log('error', e);
    if (e.output && e.output.statusCode === 400) {
      return e;
    } else if (e.output && e.output.statusCode === 404) {
      return Boom.notFound();
    }
  }
};

module.exports = { getEvents };
