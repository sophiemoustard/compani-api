const mongoose = require('mongoose');
const Boom = require('boom');
const moment = require('moment');
const pickBy = require('lodash/pickBy');
const get = require('lodash/get');
const has = require('lodash/has');
const cloneDeep = require('lodash/cloneDeep');
const flat = require('flat');
const uuidv4 = require('uuid/v4');
const Role = require('../models/Role');
const User = require('../models/User');
const Task = require('../models/Task');
const Contract = require('../models/Contract');
const translate = require('./translate');
const GdriveStorage = require('./gdriveStorage');
const RolesHelper = require('./roles');
const { AUXILIARY, PLANNING_REFERENT } = require('./constants');
const SectorHistoriesHelper = require('../helpers/sectorHistories');

const { language } = translate;

exports.getUsersList = async (query, credentials) => {
  const params = {
    ...pickBy(query),
    company: get(credentials, 'company._id', null),
  };

  if (query.role) {
    let role;
    if (Array.isArray(query.role)) role = await Role.find({ name: { $in: query.role } }, { _id: 1 }).lean();
    else role = await Role.findOne({ name: query.role }, { _id: 1 }).lean();

    if (!role) throw Boom.notFound(translate[language].roleNotFound);
    params.role = role;
  }

  return User
    .find(params, {}, { autopopulate: false })
    .populate({ path: 'procedure.task', select: 'name' })
    .populate({ path: 'customers', select: 'identity driveFolder' })
    .populate({ path: 'company', select: 'auxiliariesConfig' })
    .populate({ path: 'role', select: 'name' })
    .populate('contracts')
    .populate('sector')
    .lean({ virtuals: true });
};

exports.getUser = async (userId, credentials) => {
  const user = await User.findOne({ _id: userId })
    .populate('customers')
    .populate('contracts')
    .populate({ path: 'procedure.task', select: 'name _id' })
    .populate({ path: 'sector', select: '_id sector', match: { company: get(credentials, 'company._id', null) } })
    .lean({ autopopulate: true, virtuals: true });
  if (!user) throw Boom.notFound(translate[language].userNotFound);

  if (user.role && user.role.rights.length > 0) {
    user.role.rights = RolesHelper.populateRole(user.role.rights, { onlyGrantedRights: true });
  }

  return user;
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

exports.createAndSaveFile = async (params, payload) => {
  const uploadedFile = await GdriveStorage.addFile({
    driveFolderId: params.driveId,
    name: payload.fileName || payload.type.hapi.filename,
    type: payload['Content-Type'],
    body: payload.file,
  });

  const file = { driveId: uploadedFile.id, link: uploadedFile.webViewLink };
  switch (payload.type) {
    case 'certificates':
      await exports.saveCertificateDriveId(params._id, file);
      break;
    default:
      await exports.saveFile(params._id, payload.type, file);
      break;
  }

  return uploadedFile;
};

exports.createUser = async (userPayload, credentials) => {
  const { sector, ...payload } = cloneDeep(userPayload);
  const role = await Role.findById(payload.role, { name: 1 }).lean();
  if (!role) throw Boom.badRequest('Role does not exist');

  if ([AUXILIARY, PLANNING_REFERENT].includes(role.name)) {
    const tasks = await Task.find({}, { _id: 1 }).lean();
    const taskIds = tasks.map(task => ({ task: task._id }));
    payload.procedure = taskIds;
  }

  const userId = mongoose.Types.ObjectId();
  const companyId = get(credentials, 'company._id', null);
  const creationPromises = [User.create({
    ...payload,
    _id: userId,
    company: payload.company || companyId,
    refreshToken: uuidv4(),
  })];
  if (sector) creationPromises.push(SectorHistoriesHelper.createHistory(userId, sector, companyId));

  const [user] = await Promise.all(creationPromises);
  const populatedRights = RolesHelper.populateRole(user.role.rights, { onlyGrantedRights: true });

  return {
    ...pickBy(user),
    role: { name: user.role.name, rights: [...populatedRights] },
  };
};

exports.updateUser = async (userId, userPayload, credentials) => {
  const options = { new: true };
  let update;

  if (has(userPayload, 'administrative.certificates')) {
    update = { $pull: userPayload };
  } else {
    update = { $set: flat(userPayload) };
    options.runValidators = true;
  }

  const updatedUser = await User.findOneAndUpdate(
    { _id: userId, company: get(credentials, 'company._id', null) },
    update,
    options
  ).lean({ autopopulate: true });

  if (updatedUser.role && updatedUser.role.rights.length > 0) {
    updatedUser.role.rights = RolesHelper.populateRole(updatedUser.role.rights, { onlyGrantedRights: true });
  }

  return updatedUser;
};

exports.updateUserInactivityDate = async (user, contractEndDate, credentials) => {
  const notEndedContractCount = await Contract.countDocuments({
    user,
    company: get(credentials, 'company._id', null),
    $or: [{ endDate: { $exists: false } }, { endDate: null }],
  });

  if (!notEndedContractCount) {
    await User.updateOne(
      { _id: user },
      { $set: { inactivityDate: moment(contractEndDate).add('1', 'month').startOf('M').toDate() } }
    );
  }
};
