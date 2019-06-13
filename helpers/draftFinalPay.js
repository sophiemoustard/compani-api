const moment = require('moment');
const get = require('lodash/get');
const differenceBy = require('lodash/differenceBy');
const { COMPANY_CONTRACT } = require('./constants');
const Company = require('../models/Company');
const Surcharge = require('../models/Surcharge');
const DistanceMatrix = require('../models/DistanceMatrix');
const FinalPay = require('../models/FinalPay');
const DraftPayHelper = require('./draftPay');

const getEndDate = (contract, version) => {
  if (contract.endDate && version.endDate && moment(contract.endDate).isSame(version.endDate)) return moment(contract.endDate).endOf('d');

  return moment(version.endDate).subtract(1, 'd').endOf('d');
};

exports.getContractMonthInfo = (contract, query) => {
  const versions = contract.versions.filter(ver =>
    (moment(ver.startDate).isSameOrBefore(query.endDate) && ver.endDate && moment(ver.endDate).isSameOrAfter(query.startDate)));
  const monthBusinessDays = DraftPayHelper.getMonthBusinessDaysCount(query.startDate);

  let contractHours = 0;
  let workedDays = 0;
  for (const version of versions) {
    const startDate = moment(version.startDate).isBefore(query.startDate) ? moment(query.startDate) : moment(version.startDate).startOf('d');
    const endDate = version.endDate && moment(version.endDate).isSameOrBefore(query.endDate)
      ? getEndDate(contract, version)
      : moment(query.endDate);
    const businessDays = DraftPayHelper.getBusinessDaysCountBetweenTwoDates(startDate, endDate);
    workedDays += businessDays;
    contractHours += version.weeklyHours * (businessDays / monthBusinessDays) * 4.33;
  }

  return { contractHours, workedDaysRatio: workedDays / monthBusinessDays };
};

exports.getDraftFinalPayByAuxiliary = async (auxiliary, events, absences, company, query, distanceMatrix, surcharges, prevPay) => {
  const { _id, identity, sector, contracts } = auxiliary;
  const contract = contracts.find(cont => cont.status === COMPANY_CONTRACT && cont.endDate);
  const contractInfo = exports.getContractMonthInfo(contract, query);

  const hours = await DraftPayHelper.getPayFromEvents(events, distanceMatrix, surcharges, query);
  const absencesHours = DraftPayHelper.getPayFromAbsences(absences, contract, query);
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
    hoursCounter: prevPay ? prevPay.hoursCounter + hoursBalance : hoursBalance,
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
    endDate: { $exists: true, $lte: moment(query.endDate).endOf('d').toDate(), $gte: moment(query.startDate).startOf('d').toDate() }
  };
  const auxiliaries = await DraftPayHelper.getAuxiliariesFromContracts(contractRules);
  const existingFinalPay = await FinalPay.find({ month: moment(query.startDate).format('MM-YYYY') });
  const auxIds = differenceBy(auxiliaries.map(aux => aux._id), existingFinalPay.map(pay => pay.auxiliary), x => x.toHexString());

  const eventsByAuxiliary = await DraftPayHelper.getEventsToPay(start, end, auxIds);
  const absencesByAuxiliary = await DraftPayHelper.getAbsencesToPay(start, end, auxIds);
  const company = await Company.findOne({}).lean();
  const surcharges = await Surcharge.find({});
  const distanceMatrix = await DistanceMatrix.find();

  const prevMonthQuery = { startDate: moment(query.startDate).subtract(1, 'M').startOf('M'), endDate: moment(query.endDate).subtract(1, 'M').endOf('M') };
  const prevPayList = await DraftPayHelper.getPreviousMonthPay(prevMonthQuery, surcharges, distanceMatrix);

  const draftFinalPay = [];
  for (const id of auxIds) {
    const auxAbsences = absencesByAuxiliary.find(group => group._id.toHexString() === id.toHexString()) || { events: [] };
    const auxEvents = eventsByAuxiliary.find(group => group._id.toHexString() === id.toHexString()) || { events: [] };
    const prevPay = prevPayList.find(prev => prev.auxiliary.toHexString() === id.toHexString());
    const auxiliary = auxiliaries.find(aux => aux._id.toHexString() === id.toHexString());
    draftFinalPay.push(await exports.getDraftFinalPayByAuxiliary(auxiliary, auxEvents.events, auxAbsences.events, company, query, distanceMatrix, surcharges, prevPay));
  }

  return draftFinalPay;
};
