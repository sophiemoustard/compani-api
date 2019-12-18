const flat = require('flat');
const Boom = require('boom');
const Customer = require('../models/Customer');
const ESignHelper = require('../helpers/eSign');

exports.getMandates = async customerId => Customer.findOne(
  { _id: customerId, 'payment.mandates': { $exists: true } },
  { identity: 1, 'payment.mandates': 1 },
  { autopopulate: false }
).lean();

exports.updateMandate = async (customerId, mandateId, payload) => Customer.findOneAndUpdate(
  { _id: customerId, 'payment.mandates._id': mandateId },
  { $set: flat({ 'payment.mandates.$': { ...payload } }) },
  { new: true, select: { identity: 1, 'payment.mandates': 1 }, autopopulate: false }
).lean();

exports.getSignatureRequest = async (customerId, mandateId, payload) => {
  const customer = await Customer
    .findOne({ _id: customerId, 'payment.mandates._id': mandateId }, { payment: 1 })
    .lean();

  const mandate = customer.payment.mandates.find(m => m._id.toHexString() === mandateId);
  const doc = await ESignHelper.generateSignatureRequest({
    templateId: payload.fileId,
    fields: payload.fields,
    title: `MANDAT SEPA ${mandate.rum}`,
    signers: [{ id: '1', name: payload.customer.name, email: payload.customer.email }],
    redirect: payload.redirect,
    redirectDecline: payload.redirectDecline,
  });
  if (doc.data.error) throw Boom.badRequest(`Eversign: ${doc.data.error.type}`);

  await Customer.updateOne(
    { _id: customerId, 'payment.mandates._id': mandateId },
    { $set: flat({ 'payment.mandates.$.everSignId': doc.data.document_hash }) }
  );

  return { embeddedUrl: doc.data.signers[0].embedded_signing_url };
};
