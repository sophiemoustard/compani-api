const cloneDeep = require('lodash/cloneDeep');
const Pay = require('../models/Pay');

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
