const Boom = require('boom');
const moment = require('moment');
const bcrypt = require('bcrypt');
const pickBy = require('lodash/pickBy');
const get = require('lodash/get');
const cloneDeep = require('lodash/cloneDeep');
const omit = require('lodash/omit');
const flat = require('flat');
const uuidv4 = require('uuid/v4');
const Role = require('../models/Role');
const User = require('../models/User');
const Task = require('../models/Task');
const { TOKEN_EXPIRE_TIME } = require('../models/User');
const Contract = require('../models/Contract');
const translate = require('./translate');
const GdriveStorage = require('./gdriveStorage');
const AuthenticationHelper = require('./authentication');
const { AUXILIARY, PLANNING_REFERENT } = require('./constants');
const SectorHistoriesHelper = require('./sectorHistories');

const { language } = translate;

exports.authenticate = async (payload) => {
  const user = await User.findOne({ 'local.email': payload.email.toLowerCase() }).lean({ autopopulate: true });
  if (!user || !user.refreshToken) throw Boom.unauthorized();

  const correctPassword = await bcrypt.compare(payload.password, user.local.password);
  if (!correctPassword) throw Boom.unauthorized();

  const tokenPayload = pickBy({ _id: user._id.toHexString(), role: Object.values(user.role).map(role => role.name) });
  const token = AuthenticationHelper.encode(tokenPayload, TOKEN_EXPIRE_TIME);

  return { token, refreshToken: user.refreshToken, expiresIn: TOKEN_EXPIRE_TIME, user: tokenPayload };
};

exports.refreshToken = async (payload) => {
  const user = await User.findOne({ refreshToken: payload.refreshToken }).lean({ autopopulate: true });
  if (!user) throw Boom.unauthorized();

  const tokenPayload = pickBy({ _id: user._id.toHexString(), role: Object.values(user.role).map(role => role.name) });
  const token = AuthenticationHelper.encode(tokenPayload, TOKEN_EXPIRE_TIME);

  return { token, refreshToken: user.refreshToken, expiresIn: TOKEN_EXPIRE_TIME, user: tokenPayload };
};

exports.getUsersList = async (query, credentials) => {
  const params = {
    ...pickBy(omit(query, ['role'])),
    company: get(credentials, 'company._id', null),
  };

  if (query.role) {
    const roleNames = Array.isArray(query.role) ? query.role : [query.role];
    const roles = await Role.find({ name: { $in: roleNames } }, { _id: 1 }).lean();

    if (!roles.length) throw Boom.notFound(translate[language].roleNotFound);
    params['role.client'] = { $in: roles.map(role => role._id) };
  }

  return User.find(params, {}, { autopopulate: false })
    .populate({ path: 'procedure.task', select: 'name' })
    .populate({ path: 'customers', select: 'identity driveFolder' })
    .populate({ path: 'role.client', select: '-rights -__v -createdAt -updatedAt' })
    .populate({
      path: 'sector',
      select: '_id sector',
      match: { company: get(credentials, 'company._id', null) },
    })
    .populate('contracts')
    .lean({ virtuals: true, autopopulate: true });
};

exports.getUsersListWithSectorHistories = async (credentials) => {
  const roles = await Role.find({ name: { $in: [AUXILIARY, PLANNING_REFERENT] } }).lean();
  const roleIds = roles.map(role => role._id);
  const params = { company: get(credentials, 'company._id', null), 'role.client': { $in: roleIds } };

  return User.find(params, {}, { autopopulate: false })
    .populate({ path: 'role.client', select: '-rights -__v -createdAt -updatedAt' })
    .populate({
      path: 'sectorHistories',
      select: '_id sector startDate endDate',
      match: { company: get(credentials, 'company._id', null) },
    })
    .populate('contracts')
    .lean({ virtuals: true, autopopulate: true });
};

exports.getUser = async (userId, credentials) => {
  const user = await User.findOne({ _id: userId })
    .populate('customers')
    .populate('contracts')
    .populate({ path: 'procedure.task', select: 'name _id' })
    .populate({ path: 'sector', select: '_id sector', match: { company: get(credentials, 'company._id', null) } })
    .lean({ autopopulate: true, virtuals: true });
  if (!user) throw Boom.notFound(translate[language].userNotFound);

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
  const { sector, role: roleId, ...payload } = cloneDeep(userPayload);
  const role = await Role.findById(roleId, { name: 1, interface: 1 }).lean();
  if (!role) throw Boom.badRequest('Role does not exist');

  payload.role = { [role.interface]: role._id };

  if ([AUXILIARY, PLANNING_REFERENT].includes(role.name)) {
    const tasks = await Task.find({}, { _id: 1 }).lean();
    const taskIds = tasks.map(task => ({ task: task._id }));
    payload.procedure = taskIds;
  }

  const companyId = payload.company || get(credentials, 'company._id', null);

  const user = await User.create({ ...payload, company: companyId, refreshToken: uuidv4() });
  if (sector) await SectorHistoriesHelper.createHistory({ _id: user._id, sector }, companyId);

  return User
    .findOne({ _id: user._id })
    .populate({ path: 'sector', select: '_id sector', match: { company: companyId } })
    .lean({ virtuals: true, autopopulate: true });
};

const formatUpdatePayload = async (payload) => {
  let set;
  let pull;
  const certificates = get(payload, 'administrative.certificates');
  if (!certificates) set = payload;
  else {
    pull = { administrative: { certificates } };
    const omitKeys = Object.keys(payload.administrative).length === 1
      ? ['administrative']
      : ['administrative.certificates'];
    set = omit(payload, omitKeys);
  }

  if (payload.role) {
    const role = await Role.findById(payload.role, { name: 1, interface: 1 }).lean();
    if (!role) throw Boom.badRequest('Role does not exist');
    set.role = { [role.interface]: role._id };
  }

  const update = Object.keys(set).length > 0 ? { $set: flat(set, { maxDepth: 2 }) } : {};

  return pull ? { ...update, $pull: pull } : update;
};

exports.updateUser = async (userId, userPayload, credentials) => {
  const payload = cloneDeep(userPayload);
  const companyId = get(credentials, 'company._id', null);

  if (payload.sector) await SectorHistoriesHelper.updateHistoryOnSectorUpdate(userId, payload.sector, companyId);

  const update = await formatUpdatePayload(payload);
  return User.findOneAndUpdate({ _id: userId, company: companyId }, update, { new: true })
    .populate({ path: 'sector', select: '_id sector', match: { company: companyId } })
    .lean({ autopopulate: true, virtuals: true });
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
