const cloneDeep = require('lodash/cloneDeep');
const get = require('lodash/get');
const flatten = require('lodash/flatten');
const keyBy = require('lodash/keyBy');
const Boom = require('boom');
const moment = require('moment');
const { ObjectID } = require('mongodb');
const Pay = require('../models/Pay');
const User = require('../models/User');
const Company = require('../models/Company');
const DistanceMatrix = require('../models/DistanceMatrix');
const Surcharge = require('../models/Surcharge');
const DraftPayHelper = require('./draftPay');
const EventRepository = require('../repositories/EventRepository');
const { COMPANY_CONTRACT } = require('./constants');

exports.formatSurchargeDetail = (detail) => {
  const surchargeDetail = [];
  for (const key of Object.keys(detail)) {
    surchargeDetail.push({ ...detail[key], planId: key });
  }

  return surchargeDetail;
};

exports.formatPay = (draftPay) => {
  const payload = cloneDeep(draftPay);
  const keys = [
    'surchargedAndNotExemptDetails',
    'surchargedAndExemptDetails',
  ];
  for (const key of keys) {
    if (draftPay[key]) {
      payload[key] = exports.formatSurchargeDetail(draftPay[key]);
    }
    if (draftPay.diff && draftPay.diff[key]) {
      payload.diff[key] = exports.formatSurchargeDetail(draftPay.diff[key]);
    }
  }

  return payload;
};

exports.createPayList = async (payToCreate) => {
  const list = [];
  for (const pay of payToCreate) {
    list.push(new Pay(this.formatPay(pay)));
  }

  await Pay.insertMany(list);
};

exports.getContract = (contracts, startDate, endDate) => contracts.find((cont) => {
  const isCompanyContract = cont.status === COMPANY_CONTRACT;
  if (!isCompanyContract) return false;

  const contractStarted = moment(cont.startDate).isSameOrBefore(endDate);
  if (!contractStarted) return false;

  return !cont.endDate || moment(cont.endDate).isSameOrAfter(startDate);
});

exports.getCustomerCount = (events) => {
  const eventsGroupedByCustomer = keyBy(flatten(events), 'customer._id');

  return Object.keys(eventsGroupedByCustomer).length;
};

exports.hoursBalanceDetail = async (auxiliaryId, month, credentials) => {
  const companyId = get(credentials, 'company._id', null);
  const startDate = moment(month, 'MM-YYYY').startOf('M').toDate();
  const endDate = moment(month, 'MM-YYYY').endOf('M').toDate();
  const auxiliaryEvents = await EventRepository.getEventsToPay(startDate, endDate, [new ObjectID(auxiliaryId)], companyId);
  const customersCount = auxiliaryEvents[0] ? exports.getCustomerCount(auxiliaryEvents[0].events) : 0;

  const pay = await Pay.findOne({ auxiliary: auxiliaryId, month }).lean();
  if (pay) return { ...pay, customersCount };

  const auxiliary = await User.findOne({ _id: auxiliaryId }).populate('contracts').lean();
  const prevMonth = moment(month, 'MM-YYYY').subtract(1, 'M').format('MM-YYYY');
  const prevPay = await Pay.findOne({ month: prevMonth, auxiliary: auxiliaryId }).lean();
  const query = { startDate, endDate };
  const [company, surcharges, distanceMatrix] = await Promise.all([
    Company.findOne({ _id: companyId }).lean(),
    Surcharge.find({ company: companyId }).lean(),
    DistanceMatrix.find().lean(),
  ]);

  const prevPayList = await DraftPayHelper.getPreviousMonthPay([{ ...auxiliary, prevPay }], query, surcharges, distanceMatrix, companyId);
  const prevPayWithDiff = prevPayList.length ? prevPayList[0] : null;
  const contract = exports.getContract(auxiliary.contracts, startDate, endDate);
  if (!contract) throw Boom.badRequest();

  const events = auxiliaryEvents[0] ? auxiliaryEvents[0] : { events: [], absenses: [] };
  const draft = await DraftPayHelper.computeAuxiliaryDraftPay(auxiliary, contract, events, prevPayWithDiff, company, query, distanceMatrix, surcharges);

  return draft ? { ...draft, customersCount } : null;
};
