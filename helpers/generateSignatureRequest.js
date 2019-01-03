const { createDocument } = require('../models/ESign');

exports.generateSignatureRequest = async (params) => {
  const payload = {
    sandbox: process.env.NODE_ENV !== 'production' ? 1 : 0,
    title: params.title,
    embedded_signing_enabled: 1,
    reminders: 0,
    files: [{
      name: params.title,
      file_base64: params.file
    }],
    signers: [{
      id: '1',
      name: params.signer.name,
      email: params.signer.email
    }],
    redirect: params.redirect || '',
    redirect_decline: params.redirectDecline || ''
  };
  return createDocument(payload);
};
