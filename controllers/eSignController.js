const Boom = require('boom');
const moment = require('moment');

const translate = require('../helpers/translate');
const { createDocument } = require('../models/ESign');
const { customersSignatureFields } = require('../helpers/customersSignatureFields');
const { fileToBase64 } = require('../helpers/fileToBase64');
const { generateDocx } = require('../helpers/generateDocx');

const { language } = translate;

const generateCustomerSignatureRequest = async (req) => {
  try {
    const docxPayload = {
      file: { fileId: req.payload.fileId },
      data: req.payload.fields
    };
    const filePath = await generateDocx(docxPayload);
    const file64 = await fileToBase64(filePath);
    const payload = {
      sandbox: process.env.NODE_ENV !== 'production' ? 1 : 0,
      title: `${req.payload.type}-${req.payload.customer.name}-${moment().format('DDMMYYYY-HHmm')}`.toUpperCase(),
      embedded_signing_enabled: 1,
      reminders: 0,
      files: [{
        name: `${req.payload.type}-${moment().format('DDMMYYYY-HHmm')}`,
        file_base64: file64
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
