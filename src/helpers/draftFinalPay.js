const moment = require('moment');
const get = require('lodash/get');
const { COMPANY_CONTRACT, WEEKS_PER_MONTH } = require('./constants');
const Company = require('../models/Company');
const Surcharge = require('../models/Surcharge');
const DistanceMatrix = require('../models/DistanceMatrix');
const ContractRepository = require('../repositories/ContractRepository');
const EventRepository = require('../repositories/EventRepository');
const DraftPayHelper = require('./draftPay');

exports.getContractMonthInfo = (contract, query) => {
  const versions = contract.versions.filter(ver =>
    (moment(ver.startDate).isSameOrBefore(query.endDate) && ver.endDate && moment(ver.endDate).isSameOrAfter(query.startDate)));
  const monthBusinessDays = DraftPayHelper.getMonthBusinessDaysCount(query.startDate);

  let contractHours = 0;
  let workedDays = 0;
  for (const version of versions) {
    const startDate = moment(version.startDate).isBefore(query.startDate) ? moment(query.startDate) : moment(version.startDate).startOf('d');
    const endDate = version.endDate && moment(version.endDate).isSameOrBefore(query.endDate)
      ? moment(version.endDate).endOf('d')
      : moment(query.endDate);
    const businessDays = DraftPayHelper.getBusinessDaysCountBetweenTwoDates(startDate, endDate);
    workedDays += businessDays;
    contractHours += version.weeklyHours * (businessDays / monthBusinessDays) * WEEKS_PER_MONTH;
  }

  return { contractHours, workedDaysRatio: workedDays / monthBusinessDays };
};

exports.getDraftFinalPayByAuxiliary = async (auxiliary, eventsToPay, prevPay, company, query, distanceMatrix, surcharges) => {
  const { contracts } = auxiliary;
  const contract = contracts.find(cont => cont.status === COMPANY_CONTRACT && cont.endDate);
  const pay = await DraftPayHelper.computePay(auxiliary, contract, eventsToPay, prevPay, company, query, distanceMatrix, surcharges);

  return {
    ...pay,
    endDate: contract.endDate,
    endReason: contract.endReason,
    endNotificationDate: contract.endNotificationDate,
    compensation: 0,
  };
};

exports.getDraftFinalPay = async (query, credentials) => {
  const start = moment(query.startDate).startOf('d').toDate();
  const end = moment(query.endDate).endOf('d').toDate();
  const contractRules = {
    status: COMPANY_CONTRACT,
    endDate: { $exists: true, $lte: moment(query.endDate).endOf('d').toDate(), $gte: moment(query.startDate).startOf('d').toDate() },
  };
  const auxiliaries = await ContractRepository.getAuxiliariesToPay(contractRules, end, 'finalpays');
  if (auxiliaries.length === 0) return [];

  const [company, surcharges, distanceMatrix] = await Promise.all([
    Company.findOne().lean(),
    Surcharge.find({ company: get(credentials, 'company._id', null) }).lean(),
    DistanceMatrix.find().lean(),
  ]);

  const eventsByAuxiliary = await EventRepository.getEventsToPay(start, end, auxiliaries.map(aux => aux._id));
  const prevPayList = await DraftPayHelper.getPreviousMonthPay(auxiliaries, query, surcharges, distanceMatrix);

  const draftFinalPay = [];
  for (const auxiliary of auxiliaries) {
    const auxEvents =
      eventsByAuxiliary.find(group => group.auxiliary._id.toHexString() === auxiliary._id.toHexString())
      || { absences: [], events: [] };
    const prevPay = prevPayList.find(prev => prev.auxiliary.toHexString() === auxiliary._id.toHexString());
    const draft = await exports.getDraftFinalPayByAuxiliary(auxiliary, auxEvents, prevPay, company, query, distanceMatrix, surcharges);
    if (draft) draftFinalPay.push(draft);
  }

  return draftFinalPay;
};
