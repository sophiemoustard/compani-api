const Boom = require('@hapi/boom');
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
  SECTOR,
  RUP,
  REFERENT,
} = require('../helpers/constants');
const HistoryExportHelper = require('../helpers/historyExport');
const DataExportHelper = require('../helpers/dataExport');
const { exportToCsv } = require('../helpers/file');

const exportData = async (req, h) => {
  try {
    const { type } = req.params;
    const { credentials } = req.auth;

    let data;
    switch (type) {
      case AUXILIARY:
        data = await DataExportHelper.exportAuxiliaries(credentials);
        break;
      case HELPER:
        data = await DataExportHelper.exportHelpers(credentials);
        break;
      case FUNDING:
        data = await DataExportHelper.exportFundings(credentials);
        break;
      case CUSTOMER:
        data = await DataExportHelper.exportCustomers(credentials);
        break;
      case SUBSCRIPTION:
        data = await DataExportHelper.exportSubscriptions(credentials);
        break;
      case SERVICE:
        data = await DataExportHelper.exportServices(credentials);
        break;
      case SECTOR:
        data = await DataExportHelper.exportSectors(credentials);
        break;
      case RUP:
        data = await DataExportHelper.exportStaffRegister(credentials);
        break;
      case REFERENT:
        data = await DataExportHelper.exportReferents(credentials);
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
        exportArray = await HistoryExportHelper.exportWorkingEventsHistory(startDate, endDate, credentials);
        break;
      case BILL:
        exportArray = await HistoryExportHelper.exportBillsAndCreditNotesHistory(startDate, endDate, credentials);
        break;
      case PAYMENT:
        exportArray = await HistoryExportHelper.exportPaymentsHistory(startDate, endDate, credentials);
        break;
      case ABSENCE:
        exportArray = await HistoryExportHelper.exportAbsencesHistory(startDate, endDate, credentials);
        break;
      case PAY:
        exportArray = await HistoryExportHelper.exportPayAndFinalPayHistory(startDate, endDate, credentials);
        break;
      case CONTRACT:
        exportArray = await HistoryExportHelper.exportContractHistory(startDate, endDate, credentials);
        break;
    }

    const csv = await exportToCsv(exportArray);

    return h.file(csv, { confine: false });
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { exportData, exportHistory };
