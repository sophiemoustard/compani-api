const Boom = require('boom');

const translate = require('../../helpers/translate');
const drive = require('../../models/Google/Drive');
const { addFile } = require('../../helpers/gdriveStorage');
const { generateDocx } = require('../../helpers/file');

const { language } = translate;

const deleteFile = async (req) => {
  try {
    await drive.deleteFile({ fileId: req.params.id });
    return { message: translate[language].fileDeleted };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

const getFileById = async (req) => {
  try {
    const file = await drive.getFileById({ fileId: req.params.id });
    return { message: translate[language].fileFound, data: { file } };
  } catch (e) {
    req.log('error', e);
    if (e.message.match(/file not found/i)) {
      return Boom.notFound(translate[language].fileNotFound);
    }
    return Boom.badImplementation(e);
  }
};

const getList = async (req) => {
  try {
    const list = await drive.list({ folderId: req.query.folderId });
    return { message: translate[language].filesFound, data: { files: list.files } };
  } catch (e) {
    req.log('error', e);
    if (e.message.match(/file not found/i)) {
      return Boom.notFound(translate[language].filesNotFound);
    }
    return Boom.badImplementation(e);
  }
};

const uploadFile = async (req) => {
  try {
    const allowedFields = [
      'proofOfAbsence',
    ];
    const payloadKey = Object.keys(req.payload).find(key => allowedFields.includes(key));
    if (!payloadKey) {
      Boom.forbidden('Upload not allowed');
    }

    const uploadedFile = await addFile({
      driveFolderId: req.params.id,
      name: req.payload.fileName,
      type: req.payload['Content-Type'],
      body: req.payload[payloadKey],
    });

    const file = { driveId: uploadedFile.id, link: uploadedFile.webViewLink };
    const payload = { attachment: file };

    return {
      message: translate[language].fileCreated,
      data: { payload },
    };
  } catch (e) {
    req.log('error', e);
  }
};

const generateDocxFromDrive = async (req, h) => {
  try {
    const payload = {
      file: { fileId: req.params.id },
      data: req.payload,
    };
    const tmpOutputPath = await generateDocx(payload);
    return h.file(tmpOutputPath, {
      confine: false,
    });
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

module.exports = {
  deleteFile,
  getFileById,
  getList,
  uploadFile,
  generateDocxFromDrive,
};
