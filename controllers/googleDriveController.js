const Boom = require('boom');
const JSZip = require('jszip');
const DocxTemplater = require('docxtemplater');
const fs = require('fs');

const fsPromises = fs.promises;

const translate = require('../helpers/translate');
const drive = require('../models/GoogleDrive');

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
    const payload = { fileId: req.params.id, tmpFilePath: '/tmp/template.docx' };
    await drive.downloadFileById(payload);
    const file = await fsPromises.readFile(payload.tmpFilePath, 'binary');
    const zip = new JSZip(file);
    const doc = new DocxTemplater();
    doc.loadZip(zip);
    doc.setData(req.payload);
    doc.render();
    const filledZip = doc.getZip().generate({
      type: 'nodebuffer'
    });
    const date = new Date();
    const tmpOutputPath = `/tmp/template-filled-${date.getTime()}.docx`;
    await fsPromises.writeFile(tmpOutputPath, filledZip);
    await fsPromises.readFile(tmpOutputPath);
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
