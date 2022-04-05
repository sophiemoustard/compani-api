const CoursePayment = require('../models/CoursePayment');
const CoursePaymentNumber = require('../models/CoursePaymentNumber');
const { PAYMENT } = require('./constants');

exports.createCoursePayment = async (payload) => {
  const lastPaymentNumber = await CoursePaymentNumber
    .findOneAndUpdate({}, { $inc: { seq: 1 } }, { new: true, upsert: true, setDefaultsOnInsert: true })
    .lean();

  const formattedPayload = {
    ...payload,
    number: `${payload.nature === PAYMENT ? 'REG' : 'REMB'}-${lastPaymentNumber.seq.toString().padStart(5, '0')}`,
  };

  await CoursePayment.create(formattedPayload);
};
