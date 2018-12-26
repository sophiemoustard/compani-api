
const _ = require('lodash');
const Boom = require('boom');
const employees = require('../models/Ogust/Employee');
const customers = require('../models/Ogust/Customer');
const translate = require('../helpers/translate');
const { language } = translate;

const getEmployeeEvents = async (req, params) => {
  const servicesRaw = await employees.getServices(params);
  if (servicesRaw.data.status == 'KO') {
    throw Boom.badRequest(servicesRaw.data.message);
  }

  const events = _.filter(servicesRaw.data.array_service.result, item => item.status !== 'B');
  if (events.length === 0) {
    throw Boom.notFound(translate[language].servicesNotFound);
  }

  const uniqCustomers = [];
  for (const index in events) {
    let isUniq = false;
    if (!_.some(uniqCustomers, ['id_customer', events[index].id_customer])) {
      isUniq = true;

      const customer = await getOgustCustomer(req.headers['x-ogust-token'], events[index].id_customer, req.query.status);
      const customerThirdPartyInfos = await getOgustCustomerThirdPartyInformation(req.headers['x-ogust-token'], events[index].id_customer);
      customer.thirdPartyInformations = customerThirdPartyInfos || {};
      uniqCustomers.push(customer);

      events[index].customer = getEventCustomer(customer);
    }

    if (isUniq === false) {
      const customerUncut = _.find(uniqCustomers, ['id_customer', events[index].id_customer]);
      events[index].customer = getEventCustomer(customerUncut);
    }
  }

  return events;
};

const getCustomerEvents = async (req, params) => {
  const servicesRaw = await customers.getServices(params);
  if (servicesRaw.data.status == 'KO') {
    throw Boom.badRequest(servicesRaw.data.message);
  }

  const events = _.filter(servicesRaw.data.array_service.result, item => item.status !== 'B');
  if (events.length === 0) {
    throw Boom.notFound(translate[language].servicesNotFound);
  }

  const customer = await getOgustCustomer(req.headers['x-ogust-token'], params.id_customer, req.query.status);
  const customerThirdPartyInfos = getOgustCustomerThirdPartyInformation(req.headers['x-ogust-token'], params.id_customer);
  customer.thirdPartyInformations = customerThirdPartyInfos || {};

  const uniqEmployees = [];
  for (const index in events) {
    events[index].customer = getEventCustomer(customer);
    let isUniq = false;
    if (!_.some(uniqEmployees, ['id_employee', events[index].id_employee])) {
      isUniq = true;
      const employee = await getOgustEmployee(req.headers['x-ogust-token'], events[index].id_employee, req.query.status);
      uniqEmployees.push(employee);

      events[index].employee = getEventEmployee(employee);
    }
    if (isUniq === false) {
      const employeeUncut = _.find(uniqEmployees, ['id_employee', events[index].id_employee]);
      events[index].employee = getEventEmployee(employeeUncut);
    }
  }
  return events;
};

const getOgustCustomerThirdPartyInformation = async (token, customerId) => {
  const thirdPartyParams = {
    token,
    third_party_id: customerId,
    third_party: 'C',
    nbperpage: 10,
    pagenum: 1
  };

  const thirdPartyRaw = await customers.getThirdPartyInformationByCustomerId(thirdPartyParams);

  if (thirdPartyRaw.data.status == 'KO') {
    throw Boom.badRequest(thirdPartyRaw.data.message);
  }

  return thirdPartyRaw.data.thirdPartyInformations.array_values;
};

const getOgustCustomer = async (token, customerId, status) => {
  const customerParams = {
    token,
    id_customer: customerId,
    status: status || 'A',
  };
  const newCustomerParams = _.pickBy(customerParams);
  const customerRaw = await customers.getCustomerById(newCustomerParams);

  if (customerRaw.data.status == 'KO') {
    throw Boom.badRequest(customerRaw.data.message);
  }

  return customerRaw.data.customer;
};

const getOgustEmployee = async (token, employeeId, status) => {
  const employeeParams = {
    token,
    id_employee: employeeId,
    status: status || 'A',
  };
  const newEmployeeParams = _.pickBy(employeeParams);
  const employeeRaw = await employees.getEmployeeById(newEmployeeParams);

  if (employeeRaw.data.status == 'KO') {
    throw Boom.badRequest(employeeRaw.data.message);
  }

  return employeeRaw.data.employee;
};

const getEventCustomer = customer => ({
  id_customer: customer.id_customer,
  title: customer.title,
  firstname: customer.first_name,
  lastname: customer.last_name,
  door_code: customer.door_code,
  intercom_code: customer.intercom_code,
  pathology: customer.thirdPartyInformations.NIVEAU || '-',
  comments: customer.thirdPartyInformations.COMMNIV || '-',
  interventionDetails: customer.thirdPartyInformations.DETAILEVE || '-',
  misc: customer.thirdPartyInformations.AUTRESCOMM || '-'
});

const getEventEmployee = employee => ({
  id_employee: employee.id_employee,
  title: employee.title,
  firstname: employee.first_name,
  lastname: employee.last_name
});

module.exports = {
  getCustomerEvents,
  getEmployeeEvents,
}
