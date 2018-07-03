const Boom = require('boom');
// const _ = require('lodash');
const flat = require('flat');

const translate = require('../helpers/translate');
const { handleFile } = require('../helpers/gdriveStorage');
const drive = require('../models/Uploader/GoogleDrive');
// const cloudinary = require('../models/Uploader/Cloudinary');
const User = require('../models/User');

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
      'mutualFund',
      'vitalCard',
    ];
    const administrativeKeys = Object.keys(req.payload).filter(key => allowedFields.indexOf(key) !== -1);
    const uploadedFile = await handleFile({
      _id: req.params._id,
      name: req.payload.fileName || req.payload[administrativeKeys[0]].hapi.filename,
      type: req.payload['Content-Type'],
      body: req.payload[administrativeKeys[0]]
    });
    let driveFileInfo;
    try {
      driveFileInfo = await drive.getFileById({ fileId: uploadedFile.id });
    } catch (e) {
      req.log(['error', 'gdrive'], e);
    }
    if (administrativeKeys[0] === 'certificates') {
      const payload = {
        [`administrative.${administrativeKeys[0]}.docs`]: {
          driveId: uploadedFile.id,
          link: driveFileInfo.webViewLink
        }
      };
      await User.findOneAndUpdate({ _id: req.params._id }, { $push: payload }, { new: true });
    } else {
      const payload = {
        administrative: {
          [administrativeKeys[0]]: {
            driveId: uploadedFile.id,
            link: driveFileInfo.webViewLink
          }
        }
      };
      const user = await User.findById(req.params._id).lean();
      if (user.administrative && user.administrative[administrativeKeys[0]]) {
        const oldDocId = user.administrative[administrativeKeys[0]].driveId;
        try {
          await drive.deleteFile({ fileId: oldDocId });
        } catch (e) {
          req.log(['error', 'gdrive'], e);
        }
      }
      await User.findOneAndUpdate({ _id: req.params._id }, { $set: flat(payload) }, { new: true });
    }
    return { success: true, message: translate[language].fileCreated, data: uploadedFile };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

module.exports = {
  uploadFile
};
