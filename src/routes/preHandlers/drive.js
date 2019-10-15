const Boom = require('boom');

exports.authorizeDocumentUpload = (req) => {
  const { payload } = req;
  const allowedFields = ['proofOfAbsence'];

  const payloadKey = Object.keys(payload).find(key => allowedFields.includes(key));
  if (!payloadKey) throw Boom.forbidden('Upload not allowed');
  return payloadKey;
};
