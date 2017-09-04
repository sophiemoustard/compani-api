const _ = require('lodash');

const translate = require('../helpers/translate');
const employees = require('../models/Ogust/Employee');
const customers = require('../models/Ogust/Customer');

const language = translate.language;

const getEvents = async (req, res) => {
  try {
    if (!req.query.id_person) {
      return res.status(400).json({ success: false, message: translate[language].missingParameters });
    }
    const servicesRaw = await employees.getServices(
      req.headers['x-ogust-token'],
      req.query.id_person, 'true', 'false',
      req.query.slotToSub || 2, req.query.slotToAdd || 2, req.query.intervalType || 'week',
      '', '',
      req.query.status || '@!=|N',
      req.query.type || 'I',
      req.query.nbPerPage || '500',
      req.query.pageNum || '1'
    );
    if (servicesRaw.body.status == 'KO') {
      return res.status(400).json({ success: false, message: servicesRaw.body.message });
    }
    // Put it in a variable so it's more readable
    const events = servicesRaw.body.array_service.result;
    if (Object.keys(events).length === 0) {
      // "Il semble que tu n'aies aucune intervention de prévues d'ici 2 semaines !"
      return res.status(404).json({ success: false, message: translate[language].servicesNotFound });
    }
    const uniqCustomers = [];
    for (const index in events) {
      let isUniq = false;
      if (!_.some(uniqCustomers, ['id_customer', events[index].id_customer])) {
        isUniq = true;
        const customerRaw = await customers.getCustomerById(req.headers['x-ogust-token'], events[index].id_customer, req.query.status || 'A');
        if (customerRaw.body.status == 'KO') {
          return res.status(400).json({ success: false, message: customerRaw.body.message });
        }
        uniqCustomers.push(customerRaw.body.customer);
        events[index].customer = {
          id_customer: customerRaw.body.customer.id_customer,
          title: customerRaw.body.customer.title,
          firstname: customerRaw.body.customer.first_name,
          lastname: customerRaw.body.customer.last_name
        };
      }
      if (isUniq === false) {
        const customerUncut = _.find(uniqCustomers, ['id_customer', events[index].id_customer]);
        events[index].customer = {
          id_customer: customerUncut.id_customer,
          title: customerUncut.title,
          firstname: customerUncut.first_name,
          lastname: customerUncut.last_name
        };
      }
    }
    res.status(200).json({ success: true, message: translate[language].userShowAllFound, data: { events } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

module.exports = { getEvents };
