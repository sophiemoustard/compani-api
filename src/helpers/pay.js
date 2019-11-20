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

exports.hoursBalanceDetail = async (auxiliaryId, month, credentials) => {
  const pay = await Pay.findOne({ auxiliary: auxiliaryId, month }).lean();
  if (pay) return pay;

  const auxiliary = await User.findOne({ _id: auxiliaryId }).populate('contracts').lean();
  const startDate = moment(month, 'MM-YYYY').startOf('M');
  const endDate = moment(month, 'MM-YYYY').endOf('M');
  const query = { startDate: startDate.toDate(), endDate: endDate.toDate() };
  const detail = await DraftPayHelper.computeDraftPayByAuxiliary([auxiliary], query, credentials);

  return detail;
};
