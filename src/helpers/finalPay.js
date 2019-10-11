const FinalPay = require('../models/FinalPay');
const { formatPay } = require('./pay');

exports.createFinalPayList = async (finalPayToCreate) => {
  const finalPayList = [];
  for (const finalPay of finalPayToCreate) {
    finalPayList.push(new FinalPay(formatPay(finalPay)));
  }

  await FinalPay.insertMany(finalPayList);
};
