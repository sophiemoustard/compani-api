const cloneDeep = require('lodash/cloneDeep');
const get = require('lodash/get');
const flatten = require('lodash/flatten');
const keyBy = require('lodash/keyBy');
const moment = require('moment');
const { ObjectID } = require('mongodb');
const Pay = require('../models/Pay');
const User = require('../models/User');
const Company = require('../models/Company');
const DistanceMatrix = require('../models/DistanceMatrix');
const Surcharge = require('../models/Surcharge');
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
  const startDate = moment(month, 'MM-YYYY').startOf('M').toDate();
  const endDate = moment(month, 'MM-YYYY').endOf('M').toDate();
  const auxiliaryEvents = await EventRepository.getEventsToPay(startDate, endDate, [new ObjectID(auxiliaryId)]);
  const eventsGroupedByCustomer = keyBy(flatten(auxiliaryEvents[0].events), 'customer._id');
  const customersCount = Object.keys(eventsGroupedByCustomer).length;

  const pay = await Pay.findOne({ auxiliary: auxiliaryId, month }).lean();
  if (pay) return { ...pay, customersCount };

  const auxiliary = await User.findOne({ _id: auxiliaryId }).populate('contracts').lean();
  const query = { startDate, endDate };
  const detail = await DraftPayHelper.computeDraftPayByAuxiliary([auxiliary], query, credentials);

  const companyId = get(credentials, 'company._id', null);
  const [company, surcharges, distanceMatrix] = await Promise.all([
    Company.findOne({ _id: companyId }).lean(),
    Surcharge.find({ company: companyId }).lean(),
    DistanceMatrix.find().lean(),
  ]);

  const prevPayList = await DraftPayHelper.getPreviousMonthPay([auxiliary], query, surcharges, distanceMatrix);

  const draftPay = [];
  const auxEvents = auxiliaryEvents[0];
  const prevPay = prevPayList.length ? prevPayList[0] : null;
  const draft = await DraftPayHelper.computeAuxiliaryDraftPay(auxiliary, auxEvents, prevPay, company, query, distanceMatrix, surcharges);
  if (draft) draftPay.push(draft);

  return detail ? { ...detail[0], customersCount } : null;
};
