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

    let data;
    switch (type) {
      case AUXILIARY:
        data = await exportAuxiliaries(req.auth.credentials);
        break;
      case HELPER:
        data = await exportHelpers();
        break;
      case FUNDING:
        data = await exportFundings();
        break;
      case CUSTOMER:
        data = await exportCustomers(req.auth.credentials);
        break;
      case SUBSCRIPTION:
        data = await exportSubscriptions(req.auth.credentials);
        break;
      case SERVICE:
        data = await exportServices(req.auth.credentials);
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

    const startDate = moment(req.query.startDate).startOf('day').toDate();
    const endDate = moment(req.query.endDate).endOf('day').toDate();

    let exportArray;
    switch (type) {
      case WORKING_EVENT:
        exportArray = await exportWorkingEventsHistory(startDate, endDate);
        break;
      case BILL:
        exportArray = await exportBillsAndCreditNotesHistory(startDate, endDate, req.auth.credentials);
        break;
      case PAYMENT:
        exportArray = await exportPaymentsHistory(startDate, endDate, req.auth.credentials);
        break;
      case ABSENCE:
        exportArray = await exportAbsencesHistory(startDate, endDate, req.auth.credentials);
        break;
      case PAY:
        exportArray = await exportPayAndFinalPayHistory(startDate, endDate, req.auth.credentials);
        break;
      case CONTRACT:
        exportArray = await exportContractHistory(startDate, endDate);
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
