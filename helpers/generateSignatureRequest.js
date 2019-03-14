const { generateDocx, fileToBase64 } = require('./file');
const { createDocument } = require('../models/ESign');

exports.generateSignatureRequest = async (params) => {
  const filePath = await generateDocx({
    file: { fileId: params.templateId },
    data: params.fields
  });
  const file64 = await fileToBase64(filePath);
  const payload = {
    sandbox: process.env.NODE_ENV !== 'production' ? 1 : 0,
    title: params.title,
    embedded_signing_enabled: 1,
    use_hidden_tags: 1,
    reminders: 0,
    files: [{
      name: params.title,
      file_base64: file64
    }],
    signers: params.signers,
    redirect: params.redirect || '',
    redirect_decline: params.redirectDecline || ''
  };
  return createDocument(payload);
};
