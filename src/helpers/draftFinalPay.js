const moment = require('moment');
const get = require('lodash/get');
const { COMPANY_CONTRACT, WEEKS_PER_MONTH } = require('./constants');
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
  const versions = contract.versions.filter(ver =>
    (moment(ver.startDate).isSameOrBefore(query.endDate) && ver.endDate && moment(ver.endDate).isSameOrAfter(query.startDate)));
  const monthBusinessDays = UtilsHelper.getDaysRatioBetweenTwoDates(start, end);

  const info = ContractHelper.getContractInfo(versions, query, monthBusinessDays);

  return { contractHours: info.contractHours * WEEKS_PER_MONTH, workedDaysRatio: info.workedDaysRatio };
};

exports.getDraftFinalPayByAuxiliary = async (auxiliary, eventsToPay, prevPay, company, query, distanceMatrix, surcharges) => {
  const { contracts } = auxiliary;
  const contract = contracts.find(cont => cont.status === COMPANY_CONTRACT && cont.endDate);

  const monthBalance = await DraftPayHelper.computeBalance(auxiliary, contract, eventsToPay, company, query, distanceMatrix, surcharges);
  const hoursCounter = prevPay ? prevPay.hoursCounter + prevPay.diff.hoursBalance + monthBalance.hoursBalance : monthBalance.hoursBalance;

  return {
    ...DraftPayHelper.genericData(query, auxiliary),
    ...monthBalance,
    hoursCounter,
    mutual: !get(auxiliary, 'administrative.mutualFund.has'),
    diff: prevPay.diff,
    previousMonthHoursCounter: prevPay.hoursCounter,
    endDate: contract.endDate,
    endReason: contract.endReason,
    endNotificationDate: contract.endNotificationDate,
    compensation: 0,
  };
};

exports.getDraftFinalPay = async (query, credentials) => {
  const start = moment(query.startDate).startOf('d').toDate();
  const end = moment(query.endDate).endOf('d').toDate();
  const companyId = get(credentials, 'company._id', null);
  const contractRules = {
    company: companyId,
    status: COMPANY_CONTRACT,
    endDate: { $exists: true, $lte: moment(query.endDate).endOf('d').toDate(), $gte: moment(query.startDate).startOf('d').toDate() },
  };
  const auxiliaries = await ContractRepository.getAuxiliariesToPay(contractRules, end, 'finalpays');
  if (auxiliaries.length === 0) return [];

  const [company, surcharges, distanceMatrix] = await Promise.all([
    Company.findOne().lean(),
    Surcharge.find({ company: companyId }).lean(),
    DistanceMatrix.find().lean(),
  ]);

  const eventsByAuxiliary = await EventRepository.getEventsToPay(start, end, auxiliaries.map(aux => aux._id), companyId);
  const prevPayList = await DraftPayHelper.getPreviousMonthPay(auxiliaries, query, surcharges, distanceMatrix, companyId);

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
