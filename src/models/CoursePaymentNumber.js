const mongoose = require('mongoose');
const { PAYMENT_NATURES } = require('./Payment');
const { formatQuery, formatQueryMiddlewareList } = require('./preHooks/validate');

const CoursePaymentNumberSchema = mongoose.Schema({
  seq: { type: Number, default: 1 },
  nature: { type: String, enum: PAYMENT_NATURES, required: true },
}, { timestamps: true });

formatQueryMiddlewareList().map(middleware => CoursePaymentNumberSchema.pre(middleware, formatQuery));

module.exports = mongoose.model('CoursePaymentNumber', CoursePaymentNumberSchema);
