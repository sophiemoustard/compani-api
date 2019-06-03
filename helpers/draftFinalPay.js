const moment = require('moment');
const get = require('lodash/get');
const differenceBy = require('lodash/differenceBy');
const { COMPANY_CONTRACT } = require('./constants');
const Company = require('../models/Company');
const Surcharge = require('../models/Surcharge');
const DistanceMatrix = require('../models/DistanceMatrix');
const Pay = require('../models/Pay');
const FinalPay = require('../models/FinalPay');
const DraftPayHelper = require('./draftPay');

exports.getDraftFinalPayByAuxiliary = async (auxiliary, events, absences, company, query, distanceMatrix, surcharges, prevPay) => {
  const { _id, identity, sector, contracts } = auxiliary;
  const contract = contracts.find(cont => cont.status === COMPANY_CONTRACT && cont.endDate);
  const contractInfo = DraftPayHelper.getContractMonthInfo(contracts[0], query);

  const hours = await DraftPayHelper.getPayFromEvents(events, distanceMatrix, surcharges, query);
  const absencesHours = DraftPayHelper.getPayFromAbsences(absences, contracts[0], query);
  const hoursBalance = (hours.workedHours - contractInfo.contractHours) + absencesHours;

  return {
    auxiliaryId: auxiliary._id,
    auxiliary: { _id, identity, sector },
    startDate: query.startDate,
    endDate: contract.endDate,
    endReason: contract.endReason,
    endNotificationDate: contract.endNotificationDate,
    month: moment(query.startDate).format('MMMM'),
    contractHours: contractInfo.contractHours,
    ...hours,
    hoursBalance,
    hoursCounter: prevPay ? prevPay.hoursBalance + hoursBalance : hoursBalance,
    overtimeHours: 0,
    additionalHours: 0,
    mutual: !get(auxiliary, 'administrative.mutualFund.has'),
    transport: DraftPayHelper.getTransportRefund(auxiliary, company, contractInfo.workedDaysRatio, hours.paidKm),
    otherFees: get(company, 'rhConfig.feeAmount', 0),
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
  const existingFinalPay = await FinalPay.find({ month: moment(query.startDate).format('MMMM') });
  const auxIds = differenceBy(auxiliaries.map(aux => aux._id), existingFinalPay.map(pay => pay.auxiliary), x => x.toHexString());

  const eventsByAuxiliary = await DraftPayHelper.getEventsToPay(start, end, auxIds);
  const absencesByAuxiliary = await DraftPayHelper.getAbsencesToPay(start, end, auxIds);
  const company = await Company.findOne({}).lean();
  const surcharges = await Surcharge.find({});
  const distanceMatrix = await DistanceMatrix.find();
  const prevPayList = await Pay.find({ month: moment(query.startDate).subtract(1, 'M').format('MMMM') });

  const draftFinalPay = [];
  for (const aux of auxiliaries) {
    const auxAbsences = absencesByAuxiliary.find(group => group._id.toHexString() === aux._id.toHexString()) || { events: [] };
    const auxEvents = eventsByAuxiliary.find(group => group._id.toHexString() === aux._id.toHexString()) || { events: [] };
    const prevPay = prevPayList.find(prev => prev.auxiliary.toHexString() === aux._id.toHexString());
    draftFinalPay.push(await exports.getDraftFinalPayByAuxiliary(aux.auxiliary, auxEvents.events, auxAbsences.events, company, query, distanceMatrix, surcharges, prevPay));
  }

  return draftFinalPay;
};
