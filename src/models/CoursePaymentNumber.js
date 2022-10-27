const mongoose = require('mongoose');
const { PAYMENT_NATURES } = require('./Payment');
const { formatQuery, queryMiddlewareList } = require('./preHooks/validate');

const CoursePaymentNumberSchema = mongoose.Schema({
  seq: { type: Number, default: 1 },
  nature: { type: String, enum: PAYMENT_NATURES, required: true },
}, { timestamps: true });

queryMiddlewareList.map(middleware => CoursePaymentNumberSchema.pre(middleware, formatQuery));

module.exports = mongoose.model('CoursePaymentNumber', CoursePaymentNumberSchema);
