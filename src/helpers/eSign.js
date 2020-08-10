const DocxHelper = require('./docx');
const FileHelper = require('./file');
const ESign = require('../models/ESign');

exports.generateSignatureRequest = async (params) => {
  const filePath = await DocxHelper.generateDocx({ file: { fileId: params.templateId }, data: params.fields });
  const file64 = await FileHelper.fileToBase64(filePath);
  const payload = {
    sandbox: process.env.NODE_ENV !== 'production' ? 1 : 0,
    title: params.title,
    embedded_signing_enabled: 1,
    use_hidden_tags: 1,
    reminders: 0,
    files: [{ name: params.title, file_base64: file64 }],
    signers: params.signers,
    meta: params.meta,
    redirect: params.redirect || '',
    redirect_decline: params.redirectDecline || '',
  };

  return ESign.createDocument(payload);
};
