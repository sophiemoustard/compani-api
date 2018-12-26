const Boom = require('boom');
const _ = require('lodash');

const translate = require('../helpers/translate');
const { getCustomerEvents, getEmployeeEvents } = require('../helpers/calendar.js');

const { language } = translate;

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

    const events = personType === 'employees'
      ? await getEmployeeEvents(req, newParams)
      : await getCustomerEvents(req, newParams);

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
