const Boom = require('boom');
const _ = require('lodash');
const flat = require('flat');
const Role = require('../models/Role');
const User = require('../models/User');
const drive = require('../models/Google/Drive');
const translate = require('./translate');
const { addFile } = require('./gdriveStorage');

const { language } = translate;

const getUsers = async (query) => {
  if (query.role) {
    if (Array.isArray(query.role)) {
      query.role = await Role.find({ name: { $in: query.role } }, { _id: 1 }).lean();
    } else {
      query.role = await Role.findOne({ name: query.role }, { _id: 1 }).lean();
    }
    if (!query.role) throw Boom.notFound(translate[language].roleNotFound);
  }

  if (query.email) {
    query.local = { email: query.email };
    delete query.email;
  }

  const params = _.pickBy(query);
  return User
    .find(
      params,
      { planningModification: 0, historyChanges: 0 },
      { autopopulate: false }
    )
    .populate({ path: 'procedure.task', select: 'name' })
    .populate({ path: 'customers', select: 'identity driveFolder' })
    .populate({ path: 'company', select: 'auxiliariesConfig' })
    .populate('contracts')
    .populate('sector');
};

const saveCertificateDriveId = async (userId, fileInfo) => {
  const payload = { 'administrative.certificates': fileInfo };

  await User.findOneAndUpdate(
    { _id: userId },
    { $push: payload },
    { new: true, autopopulate: false }
  );
};

const saveAbscenceFile = async (userId, absenceId, fileInfo) => {
  const payload = { 'administrative.absences.$': fileInfo };

  await User.findOneAndUpdate(
    { _id: userId, 'administrative.absences._id': absenceId },
    { $set: flat(payload) },
    { new: true }
  );
};

const saveFile = async (userId, administrativeKeys, fileInfo) => {
  const payload = { administrative: { [administrativeKeys[0]]: fileInfo } };

  await User.findOneAndUpdate({ _id: userId }, { $set: flat(payload) }, { new: true, autopopulate: false });
};

const createAndSaveFile = async (administrativeKeys, params, payload) => {
  const uploadedFile = await addFile({
    driveFolderId: params.driveId,
    name: payload.fileName || payload[administrativeKeys[0]].hapi.filename,
    type: payload['Content-Type'],
    body: payload[administrativeKeys[0]]
  });
  const driveFileInfo = await drive.getFileById({ fileId: uploadedFile.id });

  const file = { driveId: uploadedFile.id, link: driveFileInfo.webViewLink };
  if (administrativeKeys[0] === 'certificates') {
    await saveCertificateDriveId(params._id, file);
  } else if (administrativeKeys[0] === 'absenceReason') {
    await saveAbscenceFile(params._id, payload.absenceId, file);
  } else {
    await saveFile(params._id, administrativeKeys, file);
  }

  return uploadedFile;
};

module.exports = {
  getUsers,
  createAndSaveFile,
};
