const Boom = require('boom');
const pickBy = require('lodash/pickBy');
const get = require('lodash/get');
const has = require('lodash/has');
const flat = require('flat');
const Role = require('../models/Role');
const User = require('../models/User');
const Task = require('../models/Task');
const translate = require('./translate');
const GdriveStorage = require('./gdriveStorage');
const RolesHelper = require('./roles');

const { language } = translate;

exports.getUsers = async (query, credentials) => {
  if (query.role) {
    if (Array.isArray(query.role)) {
      query.role = await Role.find({ name: { $in: query.role } }, { _id: 1 }).lean();
    } else {
      query.role = await Role.findOne({ name: query.role }, { _id: 1 }).lean();
    }
    if (!query.role) throw Boom.notFound(translate[language].roleNotFound);
  }

  query.company = get(credentials, 'company._id', null);
  const params = pickBy(query);

  return User
    .find(params, {}, { autopopulate: false })
    .populate({ path: 'procedure.task', select: 'name' })
    .populate({ path: 'customers', select: 'identity driveFolder' })
    .populate({ path: 'company', select: 'auxiliariesConfig' })
    .populate({ path: 'role', select: 'name' })
    .populate('contracts')
    .populate('sector');
};

exports.saveCertificateDriveId = async (userId, fileInfo) => {
  const payload = { 'administrative.certificates': fileInfo };

  await User.findOneAndUpdate(
    { _id: userId },
    { $push: payload },
    { new: true, autopopulate: false }
  );
};

exports.saveFile = async (userId, administrativeKey, fileInfo) => {
  const payload = { administrative: { [administrativeKey]: fileInfo } };

  await User.findOneAndUpdate({ _id: userId }, { $set: flat(payload) }, { new: true, autopopulate: false });
};

exports.createAndSaveFile = async (administrativeKey, params, payload) => {
  const uploadedFile = await GdriveStorage.addFile({
    driveFolderId: params.driveId,
    name: payload.fileName || payload[administrativeKey].hapi.filename,
    type: payload['Content-Type'],
    body: payload[administrativeKey],
  });

  const file = { driveId: uploadedFile.id, link: uploadedFile.webViewLink };
  switch (administrativeKey) {
    case 'certificates':
      await exports.saveCertificateDriveId(params._id, file);
      break;
    default:
      await exports.saveFile(params._id, administrativeKey, file);
      break;
  }

  return uploadedFile;
};

exports.createUser = async (userPayload, credentials, refreshToken) => {
  const tasks = await Task.find({}, { _id: 1 }).lean();
  const taskIds = tasks.map(task => ({ task: task._id }));
  userPayload.procedure = taskIds;
  const user = await User.create({ ...userPayload, company: get(credentials, 'company._id', null), refreshToken });
  const populatedRights = RolesHelper.populateRole(user.role.rights, { onlyGrantedRights: true });
  const payload = {
    _id: user._id.toHexString(),
    role: {
      name: user.role.name,
      rights: populatedRights,
    },
  };
  return pickBy(payload);
};

exports.updateUser = async (userId, userPayload) => {
  const options = { new: true };
  let update;

  if (has(userPayload, 'administrative.certificates')) {
    update = { $pull: userPayload };
  } else {
    update = { $set: flat(userPayload) };
    options.runValidators = true;
  }

  const updatedUser = await User.findOneAndUpdate({ _id: userId }, update, options).lean({ autopopulate: true });

  if (updatedUser.role && updatedUser.role.rights.length > 0) {
    updatedUser.role.rights = RolesHelper.populateRole(updatedUser.role.rights, { onlyGrantedRights: true });
  }

  return updatedUser;
};
