const Boom = require('boom');
const { SERVICE, AUXILIARY, HELPER, CUSTOMER, FUNDING, SUBSCRIPTION, WORKING_EVENTS } = require('../helpers/constants');
const { exportServices } = require('../helpers/services');
const { exportCustomers } = require('../helpers/customers');
const { exportSubscriptions } = require('../helpers/subscriptions');
const { exportFundings } = require('../helpers/fundings');
const { exportAuxiliaries, exportHelpers } = require('../helpers/users');
const { exportWorkingEventsHistory } = require('../helpers/events');
const { exportToCsv } = require('../helpers/file');

const exportData = async (req, h) => {
  try {
    const { type } = req.params;

    let data;
    switch (type) {
      case AUXILIARY:
        data = await exportAuxiliaries();
        break;
      case HELPER:
        data = await exportHelpers();
        break;
      case FUNDING:
        data = await exportFundings();
        break;
      case CUSTOMER:
        data = await exportCustomers();
        break;
      case SUBSCRIPTION:
        data = await exportSubscriptions();
        break;
      case SERVICE:
        data = await exportServices();
        break;
    }

    const csv = await exportToCsv(data);

    return h.file(csv, { confine: false });
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

const exportHistory = async (req, h) => {
  try {
    const { type } = req.params;

    let exportArray;
    switch (type) {
      case WORKING_EVENTS:
        exportArray = await exportWorkingEventsHistory(req.query.startDate, req.query.endDate);
        break;
    }

    const csv = await exportToCsv(exportArray);

    return h.file(csv, { confine: false });
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

module.exports = {
  exportData,
  exportHistory,
};
