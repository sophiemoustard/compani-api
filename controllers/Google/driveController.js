const Boom = require('boom');

const translate = require('../../helpers/translate');
const drive = require('../../models/Google/Drive');
const { generateDocx } = require('../../helpers/file');

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
      return Boom.notFound(translate[language].fileNotFound);
    }
    return Boom.badImplementation();
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
    return Boom.badImplementation();
  }
};

const generateDocxFromDrive = async (req, h) => {
  try {
    const payload = {
      file: { fileId: req.params.id },
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
  getList,
  generateDocxFromDrive,
};
