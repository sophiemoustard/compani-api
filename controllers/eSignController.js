const Boom = require('boom');
const moment = require('moment');

const translate = require('../helpers/translate');
const { createDocument } = require('../models/ESign');
const { customersSignatureFields } = require('../helpers/customersSignatureFields');

const { language } = translate;

const generateCustomerSignatureRequest = async (req) => {
  try {
    const payload = {
      sandbox: process.env.NODE_ENV !== 'production' ? 1 : 0,
      title: `${req.payload.type}-${req.payload.customer.name}-${moment().format('DDMMYYYY-HHmm')}`.toUpperCase(),
      embedded_signing_enabled: 1,
      reminders: 0,
      meta: { docType: req.payload.type, customerId: req.payload.customer._id },
      files: [{
        name: `${req.payload.type}-${moment().format('DDMMYYYY-HHmm')}`,
        file_base64: req.payload.file
      }],
      signers: [{
        id: '1',
        name: req.payload.customer.name,
        email: req.payload.customer.email
      }],
      fields: process.env.NODE_ENV === 'test' ? [] : [customersSignatureFields[req.payload.type]],
      redirect: req.payload.redirect || '',
      redirect_decline: req.payload.redirectDecline || ''
    };
    const doc = await createDocument(payload);
    const signatureRequest = {
      docId: doc.data.document_hash,
      embeddedUrl: doc.data.signers[0].embedded_signing_url
    };
    return {
      message: translate[language].signatureRequestCreated,
      data: { signatureRequest }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};


module.exports = {
  generateCustomerSignatureRequest
};
