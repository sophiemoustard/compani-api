const Boom = require('boom');

const translate = require('../helpers/translate');
const drive = require('../models/GoogleDrive');
const { generateDocx } = require('../helpers/generateDocx');

const { language } = translate;

const deleteFile = async (req) => {
  try {
    await drive.deleteFile({ fileId: req.params.id });
    return { message: translate[language].fileDeleted };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const getFileById = async (req) => {
  try {
    const file = await drive.getFileById({ fileId: req.params.id });
    return { message: translate[language].fileFound, data: { file } };
  } catch (e) {
    req.log('error', e);
    if (e.message.match(/file not found/i)) {
      return Boom.notFound();
    }
    return Boom.badImplementation();
  }
};

const generateDocxFromDrive = async (req, h) => {
  try {
    const payload = {
      file: {
        fileId: req.params.id,
        tmpFilePath: '/tmp/template.docx',
      },
      data: req.payload
    };
    const tmpOutputPath = await generateDocx(payload);
    return h.file(tmpOutputPath, {
      confine: false
    });
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

module.exports = {
  deleteFile,
  getFileById,
  generateDocxFromDrive
};
