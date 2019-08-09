const Boom = require('boom');
const _ = require('lodash');
const moment = require('moment');
const flat = require('flat');
const Role = require('../models/Role');
const User = require('../models/User');
const drive = require('../models/Google/Drive');
const translate = require('./translate');
const { addFile } = require('./gdriveStorage');
const { nationalities } = require('../data/nationalities.js');
const { countries } = require('../data/countries');
const { HELPER, AUXILIARY, PLANNING_REFERENT } = require('./constants.js');
const UserRepository = require('../repositories/UserRepository');

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

const createAndSaveFile = async (administrativeKey, params, payload) => {
  const uploadedFile = await addFile({
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
    case 'payDocuments':
      await UserRepository.addPayDocument(params._id, {
        nature: payload.nature,
        date: payload.date,
        file,
      });
      break;
    default:
      await saveFile(params._id, administrativeKey, file);
      break;
  }

  return uploadedFile;
};

const exportHelpers = async () => {
  const role = await Role.findOne({ name: HELPER });
  const helpers = await User.find({ role: role._id }).populate('customers');
  const data = [['Email', 'Nom', 'Prénom', 'Beneficiaire', 'Date de création']];

  for (const hel of helpers) {
    const customer = hel.customers && hel.customers[0] && hel.customers[0].identity
      ? `${hel.customers[0].identity.title} ${hel.customers[0].identity.lastname}`
      : '';
    data.push([
      hel.local && hel.local.email ? hel.local.email : '',
      hel.identity && hel.identity.lastname ? hel.identity.lastname : '',
      hel.identity && hel.identity.firstname ? hel.identity.firstname : '',
      customer,
      hel.createdAt ? moment(hel.createdAt).format('DD/MM/YYYY') : '']);
  }

  return data;
};

const exportAuxiliaries = async () => {
  const roles = await Role.find({ name: { $in: [AUXILIARY, PLANNING_REFERENT] } });
  const roleIds = roles.map(role => role._id);
  const auxiliaries = await User.find({ role: { $in: roleIds } }).populate('sector');
  const data = [['Email', 'Secteur', 'Titre', 'Nom', 'Prénom', 'Date de naissance', 'Pays de naissance', 'Departement de naissance',
    'Ville de naissance', 'Nationalité', 'N° de sécurité socile', 'Addresse', 'Téléphone', 'Nombre de contracts', 'Date d\'inactivité',
    'Date de création']];

  for (const aux of auxiliaries) {
    const auxInfo = [];
    if (aux.local && aux.local.email) auxInfo.push(aux.local.email);
    else auxInfo.push('');

    if (aux.sector && aux.sector.name) auxInfo.push(aux.sector.name);
    else auxInfo.push('');

    if (aux.identity) {
      auxInfo.push(
        aux.identity.title || '', aux.identity.lastname || '', aux.identity.firstname || '',
        aux.identity.birthDate ? moment(aux.identity.birthDate).format('DD/MM/YYYY') : '', countries[aux.identity.birthCountry] || '',
        aux.identity.birthState || '', aux.identity.birthCity || '', nationalities[aux.identity.nationality] || '',
        aux.identity.socialSecurityNumber || ''
      );
    } else auxInfo.push('', '', '', '', '', '', '', '', '');

    const address = aux.contact && aux.contact.address && aux.contact.address.fullAddress ? aux.contact.address.fullAddress : '';
    auxInfo.push(
      address, aux.mobilePhone || '', aux.contracts ? aux.contracts.length : 0, aux.inactivityDate ? moment(aux.inactivityDate).format('DD/MM/YYYY') : '',
      aux.createdAt ? moment(aux.createdAt).format('DD/MM/YYYY') : ''
    );

    data.push(auxInfo);
  }

  return data;
};

module.exports = {
  getUsers,
  createAndSaveFile,
  exportHelpers,
  exportAuxiliaries,
};
