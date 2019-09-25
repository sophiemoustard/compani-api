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
const { exportAuxiliaries, exportHelpers } = require('../helpers/users');
const {
  exportWorkingEventsHistory,
  exportAbsencesHistory,
  exportBillsAndCreditNotesHistory,
  exportContractHistory,
  exportCustomers,
} = require('../helpers/export');
const { exportPaymentsHistory } = require('../helpers/payments');
const { exportPayAndFinalPayHistory } = require('../helpers/pay');
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

    const startDate = moment(req.query.startDate).startOf('day').toDate();
    const endDate = moment(req.query.endDate).endOf('day').toDate();

    let exportArray;
    switch (type) {
      case WORKING_EVENT:
        exportArray = await exportWorkingEventsHistory(startDate, endDate);
        break;
      case BILL:
        exportArray = await exportBillsAndCreditNotesHistory(startDate, endDate);
        break;
      case PAYMENT:
        exportArray = await exportPaymentsHistory(startDate, endDate);
        break;
      case ABSENCE:
        exportArray = await exportAbsencesHistory(startDate, endDate);
        break;
      case PAY:
        exportArray = await exportPayAndFinalPayHistory(startDate, endDate);
        break;
      case CONTRACT:
        exportArray = await exportContractHistory(startDate, endDate);
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
