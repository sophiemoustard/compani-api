const moment = require('moment');
const get = require('lodash/get');
const { COMPANY_CONTRACT } = require('./constants');
const Company = require('../models/Company');
const Surcharge = require('../models/Surcharge');
const DistanceMatrix = require('../models/DistanceMatrix');
const Pay = require('../models/Pay');
const DraftPayHelper = require('./draftPay');

exports.getDraftFinalPayByAuxiliary = async (events, absences, company, query, distanceMatrix, surcharges, prevPay) => {
  const { auxiliary } = events[0] && events[0][0] ? events[0][0] : absences[0];
  const { _id, identity, sector, contracts } = auxiliary;

  const contract = contracts.find(cont => cont.status === COMPANY_CONTRACT && cont.endDate);
  const hours = await DraftPayHelper.getPayFromEvents(events, distanceMatrix, surcharges, query);
  const absencesHours = DraftPayHelper.getPayFromAbsences(absences, contracts[0], query);
  const contractInfo = DraftPayHelper.getContractMonthInfo(contracts[0], query);
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
    otherFees: get(company, 'rhConfig.phoneSubRefunding', 0),
    bonus: 0,
    compensation: 0,
  };
};

exports.getDraftFinalPay = async (auxiliaries, query) => {
  const start = moment(query.startDate).startOf('d').toDate();
  const end = moment(query.endDate).endOf('d').toDate();

  const eventsByAuxiliary = await DraftPayHelper.getEventToPay(start, end, auxiliaries);
  const absencesByAuxiliary = await DraftPayHelper.getPaidAbsences(start, end, auxiliaries);
  const company = await Company.findOne({}).lean();
  const surcharges = await Surcharge.find({});
  const distanceMatrix = await DistanceMatrix.find();
  const prevPayList = await Pay.find({ month: moment(query.startDate).subtract(1, 'M').format('MMMM') });

  const draftFinalPay = [];
  for (const auxId of auxiliaries) {
    const auxAbsences = absencesByAuxiliary.find(group => group._id.toHexString() === auxId.toHexString()) || { events: [] };
    const auxEvents = eventsByAuxiliary.find(group => group._id.toHexString() === auxId.toHexString()) || { events: [] };
    const prevPay = prevPayList.find(prev => prev.auxiliary.toHexString() === auxId.toHexString());
    if (auxEvents.events.length > 0 || auxAbsences.events.length > 0) {
      draftFinalPay.push(await exports.getDraftFinalPayByAuxiliary(auxEvents.events, auxAbsences.events, company, query, distanceMatrix, surcharges, prevPay));
    }
  }

  return draftFinalPay;
};
