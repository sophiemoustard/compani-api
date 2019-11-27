const Boom = require('boom');
const moment = require('moment');

const {
  SERVICE,
  AUXILIARY,
  HELPER,
  CUSTOMER,
  FUNDING,
  SUBSCRIPTION,
  WORKING_EVENT,
  BILL,
  PAYMENT,
  ABSENCE,
  PAY,
  CONTRACT,
} = require('../helpers/constants');
const { exportServices } = require('../helpers/services');
const { exportSubscriptions } = require('../helpers/subscriptions');
const { exportFundings } = require('../helpers/fundings');
const {
  exportWorkingEventsHistory,
  exportAbsencesHistory,
  exportBillsAndCreditNotesHistory,
  exportContractHistory,
  exportCustomers,
  exportAuxiliaries,
  exportHelpers,
  exportPayAndFinalPayHistory,
} = require('../helpers/export');
const { exportPaymentsHistory } = require('../helpers/payments');
const { exportToCsv } = require('../helpers/file');

const exportData = async (req, h) => {
  try {
    const { type } = req.params;
    const { credentials } = req.auth;

    let data;
    switch (type) {
      case AUXILIARY:
        data = await exportAuxiliaries(credentials);
        break;
      case HELPER:
        data = await exportHelpers(credentials);
        break;
      case FUNDING:
        data = await exportFundings(credentials);
        break;
      case CUSTOMER:
        data = await exportCustomers(credentials);
        break;
      case SUBSCRIPTION:
        data = await exportSubscriptions(credentials);
        break;
      case SERVICE:
        data = await exportServices(credentials);
        break;
    }

    const csv = await exportToCsv(data);

    return h.file(csv, { confine: false });
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const exportHistory = async (req, h) => {
  try {
    const { type } = req.params;
    const { credentials } = req.auth;

    const startDate = moment(req.query.startDate).startOf('day').toDate();
    const endDate = moment(req.query.endDate).endOf('day').toDate();

    let exportArray;
    switch (type) {
      case WORKING_EVENT:
        exportArray = await exportWorkingEventsHistory(startDate, endDate);
        break;
      case BILL:
        exportArray = await exportBillsAndCreditNotesHistory(startDate, endDate, credentials);
        break;
      case PAYMENT:
        exportArray = await exportPaymentsHistory(startDate, endDate, credentials);
        break;
      case ABSENCE:
        exportArray = await exportAbsencesHistory(startDate, endDate, credentials);
        break;
      case PAY:
        exportArray = await exportPayAndFinalPayHistory(startDate, endDate, credentials);
        break;
      case CONTRACT:
        exportArray = await exportContractHistory(startDate, endDate, credentials);
        break;
    }

    const csv = await exportToCsv(exportArray);

    return h.file(csv, { confine: false });
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = {
  exportData,
  exportHistory,
};
