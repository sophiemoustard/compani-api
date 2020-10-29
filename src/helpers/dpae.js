const get = require('lodash/get');
const moment = require('moment');
const FileHelper = require('./file');
const { MISTER, MRS } = require('./constants');
const User = require('../models/User');

const FS_BQ_MODE = 'V';
const FS_EMPLOI = 'Auxiliaire d\'envie';
const FS_EMPLOI_INSEE = '563b';
const FS_TYPEC = '005';
const FS_REGIME = '50';
const FS_TITRE_CODE = { [MISTER]: 1, [MRS]: 2 };

const formatBirthDate = date => (date ? moment(date).format('DD/MM/YYYY') : '');

exports.exportDpae = async (contract) => {
  const auxiliary = await User.findOne({ _id: contract.user })
    .select('identity serialNumber contact administrative.payment')
    .lean();

  const data = {
    ap_soc: process.env.AP_SOC,
    ap_matr: auxiliary.serialNumber || '',
    fs_titre: FS_TITRE_CODE[get(auxiliary, 'identity.title')] || '',
    fs_nom: get(auxiliary, 'identity.lastname') || '',
    fs_prenom: get(auxiliary, 'identity.firstname') || '',
    fs_secu: get(auxiliary, 'identity.socialSecurityNumber') || '',
    fs_date_nai: formatBirthDate(get(auxiliary, 'identity.birthDate')),
    fs_dept_nai: get(auxiliary, 'identity.birthState') || '',
    fs_lieu_nai: get(auxiliary, 'identity.birthCity') || '',
    fs_adr1: get(auxiliary, 'contact.address.street') || '',
    fs_cp: get(auxiliary, 'contact.address.zipCode') || '',
    fs_ville: get(auxiliary, 'contact.address.city') || '',
    fs_bq_iban: get(auxiliary, 'administrative.payment.rib.iban') || '',
    fs_bq_bic: get(auxiliary, 'administrative.payment.rib.bic') || '',
    fs_bq_mode: FS_BQ_MODE,
    fs_regime: FS_REGIME,
    fs_typec: FS_TYPEC,
    fs_emploi: FS_EMPLOI,
    fs_emploi_insee: FS_EMPLOI_INSEE,
    fs_anc: moment(contract.startDate).format('DD/MM/YYYY'),
    fs_mv_entree: moment(contract.startDate).format('DD/MM/YYYY'),
  };

  return FileHelper.exportToTxt([Object.keys(data), Object.values(data)], 'dpae.txt');
};
