const Boom = require('boom');
const get = require('lodash/get');
const has = require('lodash/has');
const pickBy = require('lodash/pickBy');
const moment = require('moment');
const flat = require('flat');
const Role = require('../models/Role');
const User = require('../models/User');
const drive = require('../models/Google/Drive');
const translate = require('./translate');
const GdriveStorage = require('./gdriveStorage');
const { nationalities } = require('../data/nationalities.js');
const { countries } = require('../data/countries');
const { HELPER, AUXILIARY, PLANNING_REFERENT } = require('./constants.js');

const { language } = translate;

exports.getUsers = async (query) => {
  if (query.role) {
    if (Array.isArray(query.role)) {
      query.role = await Role.find({ name: { $in: query.role } }, { _id: 1 }).lean();
    } else {
      query.role = await Role.findOne({ name: query.role }, { _id: 1 }).lean();
    }
    if (!query.role) throw Boom.notFound(translate[language].roleNotFound);
  }

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

const saveCertificateDriveId = async (userId, fileInfo) => {
  const payload = { 'administrative.certificates': fileInfo };

  await User.findOneAndUpdate(
    { _id: userId },
    { $push: payload },
    { new: true, autopopulate: false }
  );
};

const saveFile = async (userId, administrativeKey, fileInfo) => {
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
  const driveFileInfo = await drive.getFileById({ fileId: uploadedFile.id });

  const file = { driveId: uploadedFile.id, link: driveFileInfo.webViewLink };
  switch (administrativeKey) {
    case 'certificates':
      await saveCertificateDriveId(params._id, file);
      break;
    default:
      await saveFile(params._id, administrativeKey, file);
      break;
  }

  return uploadedFile;
};

const helperExportHeader = [
  'Email',
  'Aidant - Nom',
  'Aidant - Prénom',
  'Bénéficiaire - Titre',
  'Bénéficiaire - Nom',
  'Bénéficiaire - Prénom',
  'Date de création',
];

exports.exportHelpers = async () => {
  const role = await Role.findOne({ name: HELPER });
  const helpers = await User.find({ role: role._id }).populate('customers');
  const data = [helperExportHeader];

  for (const hel of helpers) {
    const customer = hel.customers && hel.customers[0];
    data.push([
      get(hel, 'local.email', ''),
      get(hel, 'identity.lastname', '').toUpperCase(),
      get(hel, 'identity.firstname', ''),
      get(customer, 'identity.title', ''),
      get(customer, 'identity.lastname', '').toUpperCase(),
      get(customer, 'identity.firstname', ''),
      hel.createdAt ? moment(hel.createdAt).format('DD/MM/YYYY') : '']);
  }

  return data;
};

const auxiliaryExportHeader = [
  'Email',
  'Équipe',
  'Titre',
  'Nom',
  'Prénom',
  'Date de naissance',
  'Pays de naissance',
  'Departement de naissance',
  'Ville de naissance',
  'Nationalité',
  'N° de sécurité sociale',
  'Addresse',
  'Téléphone',
  'Nombre de contracts',
  'Date d\'inactivité',
  'Date de création',
];

exports.exportAuxiliaries = async () => {
  const roles = await Role.find({ name: { $in: [AUXILIARY, PLANNING_REFERENT] } });
  const roleIds = roles.map(role => role._id);
  const auxiliaries = await User.find({ role: { $in: roleIds } }).populate('sector');
  const data = [auxiliaryExportHeader];

  for (const aux of auxiliaries) {
    const nationality = get(aux, 'identity.nationality');
    const lastname = get(aux, 'identity.lastname');
    const birthDate = get(aux, 'identity.birthDate');
    const address = get(aux, 'contact.address.fullAddress');
    const birthCountry = get(aux, 'identity.birthCountry');
    const { contracts, inactivityDate, createdAt, mobilePhone } = aux;

    data.push([
      get(aux, 'local.email') || '',
      get(aux, 'sector.name') || '',
      get(aux, 'identity.title') || '',
      lastname ? lastname.toUpperCase() : '',
      get(aux, 'identity.firstname') || '',
      birthDate ? moment(birthDate).format('DD/MM/YYYY') : '',
      countries[birthCountry] || '',
      get(aux, 'identity.birthState') || '',
      get(aux, 'identity.birthCity') || '',
      nationality ? nationalities[nationality] : '',
      get(aux, 'identity.socialSecurityNumber') || '',
      address || '',
      mobilePhone || '',
      contracts ? contracts.length : 0,
      inactivityDate ? moment(inactivityDate).format('DD/MM/YYYY') : '',
      createdAt ? moment(createdAt).format('DD/MM/YYYY') : '',
    ]);
  }

  return data;
};
