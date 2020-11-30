const get = require('lodash/get');
const moment = require('moment');
const { pick } = require('lodash');
const FileHelper = require('./file');
const {
  MISTER,
  MRS,
  WEEKS_PER_MONTH,
  ABSENCE,
  PAID_LEAVE,
  UNPAID_LEAVE,
  MATERNITY_LEAVE,
  PATERNITY_LEAVE,
  PARENTAL_LEAVE,
  ILLNESS,
  UNJUSTIFIED,
  WORK_ACCIDENT,
  TRANSPORT_ACCIDENT,
  DAILY,
  HOURLY,
} = require('./constants');
const HistoryExportHelper = require('./historyExport');
const ContractHelper = require('./contracts');
const User = require('../models/User');
const Event = require('../models/Event');
const Contract = require('../models/Contract');
const Pay = require('../models/Pay');
const { bicBankMatching } = require('../data/bicBankMatching');

const FS_BQ_MODE = 'V'; // Virement
const BQ_DOM_MAX_LENGTH = 25;
const DEFAULT_BQ_DOM = 'banque';
const FS_EMPLOI = 'Auxiliaire d\'envie';
const FS_EMPLOI_INSEE = '563b'; // Aides à domicile, aides ménagères, travailleuses familiales
const FS_NATC = '00201:0:0:0:0:0'; // Service à la personne ou aide à domicile - Service à la personne
const FS_CATEG = '015'; // Intervenants
const FS_TYPEC = '005'; // CDI
const FS_REGIME = '50'; // Non cadre
const ADDRESS_MAX_LENGHT = 30;
const FS_TITRE_CODE = { [MISTER]: 1, [MRS]: 2 };
const NIC_LENGHT = 5;
const VA_ABS_CODE = {
  [PAID_LEAVE]: 'CPL',
  [UNPAID_LEAVE]: 'CSS',
  [MATERNITY_LEAVE]: 'MAT',
  [PATERNITY_LEAVE]: 'ENF',
  [PARENTAL_LEAVE]: 'CPE',
  [ILLNESS]: 'MAL',
  [UNJUSTIFIED]: 'ANN',
  [WORK_ACCIDENT]: 'ATW',
  [TRANSPORT_ACCIDENT]: 'ATR',
};

exports.formatBirthDate = date => (date ? moment(date).format('DD/MM/YYYY') : '');

exports.shortenAddress = (str = '', separator = ' ') => (str.length <= ADDRESS_MAX_LENGHT
  ? str
  : str.substr(0, str.lastIndexOf(separator, ADDRESS_MAX_LENGHT)));

exports.formatAddress = (address) => {
  if (!address) return { start: '', end: '' };

  const start = exports.shortenAddress(address);

  return { start, end: exports.shortenAddress(address.substr(start.length + 1)) };
};

exports.formatIdentificationInfo = (auxiliary) => {
  const address = exports.formatAddress(get(auxiliary, 'contact.address.street'));

  return {
    ap_soc: process.env.AP_SOC,
    ap_etab: (get(auxiliary, 'establishment.siret') || '').slice(-NIC_LENGHT),
    ap_matr: auxiliary.serialNumber || '',
    fs_titre: FS_TITRE_CODE[get(auxiliary, 'identity.title')] || '',
    fs_nom: get(auxiliary, 'identity.lastname') || '',
    fs_prenom: get(auxiliary, 'identity.firstname') || '',
    fs_secu: get(auxiliary, 'identity.socialSecurityNumber') || '',
    fs_date_nai: exports.formatBirthDate(get(auxiliary, 'identity.birthDate')),
    fs_dept_nai: get(auxiliary, 'identity.birthState') || '',
    fs_pays_nai: get(auxiliary, 'identity.birthCountry') || '',
    fs_lieu_nai: get(auxiliary, 'identity.birthCity') || '',
    fs_nat: get(auxiliary, 'identity.nationality') || '',
    fs_adr1: address.start || '',
    fs_adr2: address.end || '',
    fs_cp: get(auxiliary, 'contact.address.zipCode') || '',
    fs_ville: get(auxiliary, 'contact.address.city') || '',
    fs_pays: 'FR',
  };
};

exports.formatBankingInfo = (auxiliary) => {
  const bic = get(auxiliary, 'administrative.payment.rib.bic') || '';
  const bqDom = bicBankMatching[bic.substring(0, 8)];

  return {
    fs_bq_dom: bqDom ? bqDom.substring(0, BQ_DOM_MAX_LENGTH).trim() : DEFAULT_BQ_DOM,
    fs_bq_iban: get(auxiliary, 'administrative.payment.rib.iban') || '',
    fs_bq_bic: bic,
    fs_bq_mode: FS_BQ_MODE,
  };
};

exports.formatContractInfo = contract => ({
  ap_contrat: contract.serialNumber || '',
  fs_regime: FS_REGIME,
  fs_natc: FS_NATC,
  fs_categ: FS_CATEG,
  fs_typec: FS_TYPEC,
  fs_emploi: FS_EMPLOI,
  fs_emploi_insee: FS_EMPLOI_INSEE,
  fs_anc: moment(contract.startDate).format('DD/MM/YYYY'),
  fs_mv_entree: moment(contract.startDate).format('DD/MM/YYYY'),
  fs_date_avenant: moment(contract.startDate).format('DD/MM/YYYY'),
  fs_horaire: contract.versions[0].weeklyHours * WEEKS_PER_MONTH,
});

exports.exportDpae = async (contract) => {
  const auxiliary = await User
    .findOne({ _id: contract.user }, 'identity serialNumber contact administrative.payment establishment')
    .populate({ path: 'establishment', select: 'siret' })
    .lean();

  const data = {
    ...exports.formatIdentificationInfo(auxiliary),
    ...exports.formatBankingInfo(auxiliary),
    ...exports.formatContractInfo(contract),
  };

  return FileHelper.exportToTxt([Object.keys(data), Object.values(data)]);
};

exports.exportIdentification = async (query, credentials) => {
  const endDate = moment(query.endDate).endOf('d').toDate();
  const companyId = get(credentials, 'company._id') || '';

  const contractQuery = {
    startDate: { $lte: endDate },
    $or: [{ endDate: null }, { endDate: { $exists: false } }, { endDate: { $gt: endDate } }],
    company: companyId,
  };
  const contracts = await Contract.find(contractQuery)
    .populate({ path: 'user', select: 'serialNumber identity contact.address administrative.payment' })
    .lean();

  const data = [];
  for (const contract of contracts) {
    const info = {
      ...exports.formatIdentificationInfo(contract.user),
      ...exports.formatBankingInfo(contract.user),
    };

    if (!data.length) data.push(Object.keys(info));
    data.push(Object.values(info));
  }

  return FileHelper.exportToTxt(data);
};

exports.exportContractVersions = async (query, credentials) => {
  const rules = ContractHelper.getQuery(query, get(credentials, 'company._id') || '');

  const contracts = await Contract.find({ $and: rules })
    .populate({ path: 'user', select: 'serialNumber identity' })
    .lean();
  const filteredVersions = contracts
    .map(c => c.versions
      .filter(v => moment(v.startDate).isBetween(query.startDate, query.endDate, 'day', '[]'))
      .map(v => ({ ...v, ...pick(c, ['user', 'serialNumber']) })))
    .flat();

  const data = [];
  for (const version of filteredVersions) {
    data.push({
      ap_soc: process.env.AP_SOC,
      ap_matr: get(version, 'user.serialNumber') || '',
      fs_nom: get(version, 'user.identity.lastname') || '',
      ap_contrat: version.serialNumber || '',
      fs_date_avenant: moment(version.startDate).format('DD/MM/YYYY'),
      fs_horaire: version.weeklyHours * WEEKS_PER_MONTH,
    });
  }

  return FileHelper.exportToTxt([Object.keys(data[0]), ...data.map(d => Object.values(d))]);
};

const exportHeader = [
  'ap_soc',
  'ap_etab',
  'ap_matr',
  'ap_contrat',
  'va_abs_code',
  'va_abs_deb',
  'va_abs_fin',
  'va_abs_date',
  'va_abs_nb22',
  'va_abs_nb26',
  'va_abs_nb30',
  'va_abs_nbh',
];

exports.getAbsences = async (query, credentials) => {
  const companyId = get(credentials, 'company._id') || '';
  const lastMonth = moment(query.endDate).subtract(1, 'month').startOf('month').toDate();
  const lastPay = await Pay.find({ date: { $gte: lastMonth }, company: companyId })
    .sort({ createdAt: -1 })
    .limit(1)
    .lean();

  const start = lastPay.length
    ? moment(lastPay[0].createdAt).toDate()
    : moment(query.startDate).startOf('day').toDate();
  const end = moment(query.endDate).endOf('day').toDate();

  return Event
    .find({
      type: ABSENCE,
      absence: { $in: Object.keys(VA_ABS_CODE) },
      startDate: { $lt: end },
      endDate: { $gt: start },
      company: companyId,
    })
    .populate({
      path: 'auxiliary',
      select: 'serialNumber',
      populate: [{ path: 'contracts' }, { path: 'establishment' }],
    })
    .lean();
};

exports.exportAbsences = async (query, credentials) => {
  const absences = await exports.getAbsences(query, credentials);

  const data = [exportHeader];
  for (const abs of absences) {
    const matchingContract = abs.auxiliary.contracts.find((c) => {
      if (c.endDate) return moment(abs.startDate).isBetween(c.startDate, c.endDate, 'd', '[]');
      return moment(abs.startDate).isSameOrAfter(c.startDate, 'd');
    });

    const absenceInfo = {
      ap_soc: process.env.AP_SOC,
      ap_etab: (get(abs, 'auxiliary.establishment.siret') || '').slice(-NIC_LENGHT),
      ap_matr: abs.auxiliary.serialNumber || '',
      ap_contrat: matchingContract.serialNumber || '',
      va_abs_code: VA_ABS_CODE[abs.absence],
      va_abs_deb: moment(abs.startDate).format('DD/MM/YYYY'),
      va_abs_fin: moment(abs.endDate).format('DD/MM/YYYY'),
    };

    const range = Array.from(moment().range(abs.startDate, abs.endDate).by('days'));
    for (const day of range) {
      const formattedAbsence = abs.absenceNature === HOURLY
        ? { ...abs }
        : {
          absenceNature: DAILY,
          startDate: moment(day).startOf('d').toISOString(),
          endDate: moment(day).endOf('d').toISOString(),
        };
      data.push(Object.values({
        ...absenceInfo,
        va_abs_date: moment(day).format('DD/MM/YYYY'),
        va_abs_nb22: [1, 2, 3, 4, 5].includes(moment(day).isoWeekday()) ? 1 : 0,
        va_abs_nb26: [1, 2, 3, 4, 5, 6].includes(moment(day).isoWeekday()) ? 1 : 0,
        va_abs_nb30: 1,
        va_abs_nbh: HistoryExportHelper.getAbsenceHours(formattedAbsence, [matchingContract]),
      }));
    }
  }

  return FileHelper.exportToTxt(data);
};
