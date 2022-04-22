const moment = require('moment');
const get = require('lodash/get');
const { WEEKS_PER_MONTH } = require('./constants');
const Company = require('../models/Company');
const Surcharge = require('../models/Surcharge');
const DistanceMatrix = require('../models/DistanceMatrix');
const ContractRepository = require('../repositories/ContractRepository');
const EventRepository = require('../repositories/EventRepository');
const DraftPayHelper = require('./draftPay');
const UtilsHelper = require('./utils');
const ContractHelper = require('./contracts');

exports.getContractMonthInfo = (contract, query) => {
  const start = moment(query.startDate).startOf('M').toDate();
  const end = moment(query.startDate).endOf('M').toDate();
  const versions = contract.versions.filter(ver => (moment(ver.startDate).isSameOrBefore(query.endDate) &&
    ver.endDate && moment(ver.endDate).isSameOrAfter(query.startDate)));
  const monthBusinessDays = UtilsHelper.getDaysRatioBetweenTwoDates(start, end);

  const info = ContractHelper.getContractInfo(versions, query, monthBusinessDays);

  return { contractHours: info.contractHours * WEEKS_PER_MONTH, workedDaysRatio: info.workedDaysRatio };
};

exports.computeAuxiliaryDraftFinalPay = async (
  auxiliary,
  events,
  subscriptions,
  prevPay,
  company,
  query,
  dm,
  surcharges
) => {
  const { contracts } = auxiliary;
  const contract = contracts.find(cont => cont.endDate);

  const monthBalance =
    await DraftPayHelper.computeBalance(auxiliary, contract, events, subscriptions, company, query, dm, surcharges);
  const hoursCounter = prevPay
    ? prevPay.hoursCounter + prevPay.diff.hoursBalance + monthBalance.hoursBalance
    : monthBalance.hoursBalance;

  return {
    ...DraftPayHelper.genericData(query, auxiliary),
    ...monthBalance,
    startDate: moment(query.startDate).isBefore(contract.startDate) ? contract.startDate : query.startDate,
    hoursCounter,
    mutual: !get(auxiliary, 'administrative.mutualFund.has'),
    diff: get(prevPay, 'diff') || DraftPayHelper.computeDiff(null, null, 0, 0),
    previousMonthHoursCounter: get(prevPay, 'hoursCounter') || 0,
    endDate: contract.endDate,
    endReason: contract.endReason,
    endNotificationDate: contract.endNotificationDate,
    compensation: 0,
  };
};

exports.computeDraftFinalPay = async (auxiliaries, query, credentials) => {
  const companyId = get(credentials, 'company._id', null);
  const { startDate, endDate } = query;
  const auxIds = auxiliaries.map(aux => aux._id);
  const [company, surcharges, dm] = await Promise.all([
    Company.findOne({ _id: companyId }).lean(),
    Surcharge.find({ company: companyId }).lean(),
    DistanceMatrix.find({ company: companyId }).lean(),
  ]);

  const eventsByAuxiliary = await EventRepository.getEventsToPay(startDate, endDate, auxIds, companyId);
  const subscriptions = await DraftPayHelper.getSubscriptionsForPay(companyId);
  // Counter is reset on January
  const prevPayList = moment(query.startDate).month() === 0
    ? []
    : await DraftPayHelper.getPreviousMonthPay(auxiliaries, subscriptions, query, surcharges, dm, companyId);

  const draftFinalPay = [];
  for (const aux of auxiliaries) {
    const events = eventsByAuxiliary.find(group => UtilsHelper.areObjectIdsEquals(group.auxiliary._id, aux._id)) ||
      { absences: [], events: [] };
    const prevPay = prevPayList.find(prev => UtilsHelper.areObjectIdsEquals(prev.auxiliary, aux._id));
    const draft =
      await exports.computeAuxiliaryDraftFinalPay(aux, events, subscriptions, prevPay, company, query, dm, surcharges);
    if (draft) draftFinalPay.push(draft);
  }

  return draftFinalPay;
};

exports.getDraftFinalPay = async (query, credentials) => {
  const startDate = moment(query.startDate).startOf('d').toDate();
  const endDate = moment(query.endDate).endOf('d').toDate();

  const contractRules = {
    endDate: {
      $exists: true,
      $lte: moment(query.endDate).endOf('d').toDate(),
      $gte: moment(query.startDate).startOf('d').toDate(),
    },
  };
  const companyId = get(credentials, 'company._id', null);
  const auxiliaries = await ContractRepository.getAuxiliariesToPay(contractRules, endDate, 'finalpays', companyId);
  if (auxiliaries.length === 0) return [];

  return exports.computeDraftFinalPay(auxiliaries, { startDate, endDate }, credentials);
};
