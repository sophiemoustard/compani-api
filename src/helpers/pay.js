const cloneDeep = require('lodash/cloneDeep');
const { ObjectID } = require('mongodb');
const moment = require('moment');
const Pay = require('../models/Pay');
const User = require('../models/User');
const Company = require('../models/Company');
const Surcharge = require('../models/Surcharge');
const DistanceMatrix = require('../models/DistanceMatrix');
const DraftPayHelper = require('./draftPay');
const EventRepository = require('../repositories/EventRepository');

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

exports.hoursBalanceDetail = async (auxiliaryId, month) => {
  const pay = await Pay.findOne({ auxiliary: auxiliaryId, month }).lean();
  if (pay) return pay;

  const auxiliary = await User.findOne({ _id: auxiliaryId }).populate('contracts').lean();
  const startDate = moment(month, 'MM-YYYY').startOf('M');
  const endDate = moment(month, 'MM-YYYY').endOf('M');
  const query = { startDate: startDate.toDate(), endDate: endDate.toDate() };
  const prevMonthQuery = {
    startDate: startDate.subtract(1, 'M').toDate(),
    endDate: endDate.subtract(1, 'M').toDate(),
  };
  const [eventsToPay, prevMonthEventsToPay, prevPay, company, distanceMatrix, surcharges] = await Promise.all([
    EventRepository.getEventsToPay(query.startDate, query.endDate, [new ObjectID(auxiliaryId)]),
    EventRepository.getEventsToPay(prevMonthQuery.startDate, prevMonthQuery.endDate, [new ObjectID(auxiliaryId)]),
    Pay.findOne({ auxiliary: auxiliaryId, month: moment(month, 'MM-YYYY').subtract(1, 'M').format('MM-YYYY') }).lean(),
    Company.findOne({ _id: auxiliary.company }).lean(),
    Surcharge.find({ company: auxiliary.company }).lean(),
    DistanceMatrix.find().lean(),
  ]);

  const prevPayDiff = await DraftPayHelper.computePrevPayDiff(auxiliary, prevMonthEventsToPay[0], prevPay, prevMonthQuery, distanceMatrix, surcharges);
  const detail = await DraftPayHelper.getDraftPayByAuxiliary(auxiliary, eventsToPay[0], prevPayDiff, company, query, distanceMatrix, surcharges);

  return detail;
};
