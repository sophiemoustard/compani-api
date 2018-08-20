const Boom = require('boom');
const flat = require('flat');

const { handleFile } = require('../helpers/gdriveStorage');
const translate = require('../helpers/translate');
const User = require('../models/User');
const drive = require('../models/GoogleDrive');

const { language } = translate;

const uploadFile = async (req) => {
  try {
    const allowedFields = [
      'idCardRecto',
      'idCardVerso',
      'healthAttest',
      'certificates',
      'phoneInvoice',
      'navigoInvoice',
      'transportInvoice',
      'mutualFund',
      'vitalCard',
    ];
    const administrativeKeys = Object.keys(req.payload).filter(key => allowedFields.indexOf(key) !== -1);
    const uploadedFile = await handleFile({
      _id: req.payload._id,
      name: req.payload.fileName || req.payload[administrativeKeys[0]].hapi.filename,
      type: req.payload['Content-Type'],
      body: req.payload[administrativeKeys[0]]
    });
    let driveFileInfo = null;
    try {
      driveFileInfo = await drive.getFileById({ fileId: uploadedFile.id });
    } catch (e) {
      req.log(['error', 'gdrive'], e);
    }
    if (administrativeKeys[0] === 'certificates') {
      const payload = {
        [`administrative.${administrativeKeys[0]}.docs`]: {
          driveId: uploadedFile.id,
          link: driveFileInfo.webViewLink,
          thumbnailLink: driveFileInfo.thumbnailLink
        }
      };
      await User.findOneAndUpdate({ _id: req.params._id }, { $push: payload }, { new: true });
    } else {
      const payload = {
        administrative: {
          [administrativeKeys[0]]: {
            driveId: uploadedFile.id,
            link: driveFileInfo.webViewLink,
            thumbnailLink: driveFileInfo.thumbnailLink
          }
        }
      };
      await User.findOneAndUpdate({ _id: req.params._id }, { $set: flat(payload) }, { new: true });
    }
    return { message: translate[language].fileCreated, data: { uploadedFile } };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

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
    return Boom.badImplementation();
  }
};

module.exports = {
  uploadFile,
  deleteFile,
  getFileById
};
