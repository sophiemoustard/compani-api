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
  const { _id, identity, sector, contracts } = auxiliary;
  const contract = contracts.find(cont => cont.status === COMPANY_CONTRACT && cont.endDate);
  const contractInfo = exports.getContractMonthInfo(contract, query);

  const hours = await DraftPayHelper.getPayFromEvents(eventsToPay.events, auxiliary, distanceMatrix, surcharges, query);
  const absencesHours = DraftPayHelper.getPayFromAbsences(eventsToPay.absences, contract, query);
  const hoursBalance = (hours.workedHours - contractInfo.contractHours) + absencesHours;

  return {
    auxiliaryId: auxiliary._id,
    auxiliary: { _id, identity, sector },
    startDate: query.startDate,
    endDate: contract.endDate,
    endReason: contract.endReason,
    endNotificationDate: contract.endNotificationDate,
    month: moment(query.startDate).format('MM-YYYY'),
    contractHours: contractInfo.contractHours,
    ...hours,
    hoursBalance,
    hoursCounter: prevPay ? prevPay.hoursCounter + prevPay.diff + hoursBalance : hoursBalance,
    overtimeHours: 0,
    additionalHours: 0,
    mutual: !get(auxiliary, 'administrative.mutualFund.has'),
    transport: DraftPayHelper.getTransportRefund(auxiliary, company, contractInfo.workedDaysRatio, hours.paidKm),
    otherFees: (get(company, 'rhConfig.feeAmount') || 0) * contractInfo.workedDaysRatio,
    bonus: 0,
    compensation: 0,
  };
};

exports.getDraftFinalPay = async (query) => {
  const start = moment(query.startDate).startOf('d').toDate();
  const end = moment(query.endDate).endOf('d').toDate();
  const contractRules = {
    status: COMPANY_CONTRACT,
    endDate: { $exists: true, $lte: moment(query.endDate).endOf('d').toDate(), $gte: moment(query.startDate).startOf('d').toDate() },
  };
  const auxiliaries = await ContractRepository.getAuxiliariesToPay(contractRules, end, 'finalPays');
  if (auxiliaries.length === 0) return [];

  const [company, surcharges, distanceMatrix] = await Promise.all([
    Company.findOne().lean(),
    Surcharge.find().lean(),
    DistanceMatrix.find().lean(),
  ]);

  const eventsByAuxiliary = await EventRepository.getEventsToPay(start, end, auxiliaries.map(aux => aux._id));
  const prevMonthQuery = {
    startDate: moment(query.startDate).subtract(1, 'M').startOf('M'),
    endDate: moment(query.endDate).subtract(1, 'M').endOf('M'),
  };
  const prevPayList = await DraftPayHelper.getPreviousMonthPay(auxiliaries, prevMonthQuery, surcharges, distanceMatrix);

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
