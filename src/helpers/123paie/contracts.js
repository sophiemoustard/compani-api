const get = require('lodash/get');
const moment = require('moment');
const { pick } = require('lodash');
const FileHelper = require('../file');
const {
  WEEKS_PER_MONTH,
  EMPLOYER_TRIAL_PERIOD_TERMINATION,
  EMPLOYEE_TRIAL_PERIOD_TERMINATION,
  RESIGNATION,
  SERIOUS_MISCONDUCT_LAYOFF,
  GROSS_FAULT_LAYOFF,
  OTHER_REASON_LAYOFF,
  MUTATION,
  CONTRACTUAL_TERMINATION,
  INTERNSHIP_END,
  CDD_END,
  OTHER,
} = require('../constants');
const ContractHelper = require('../contracts');
const Contract = require('../../models/Contract');

const FS_MV_MOTIF_S = {
  [EMPLOYER_TRIAL_PERIOD_TERMINATION]: 34,
  [EMPLOYEE_TRIAL_PERIOD_TERMINATION]: 35,
  [RESIGNATION]: 59,
  [SERIOUS_MISCONDUCT_LAYOFF]: 16,
  [GROSS_FAULT_LAYOFF]: 17,
  [OTHER_REASON_LAYOFF]: 20,
  [MUTATION]: 62,
  [CONTRACTUAL_TERMINATION]: 8,
  [INTERNSHIP_END]: 80,
  [CDD_END]: 31,
  [OTHER]: 60,
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
      fs_sal_forfait_montant: version.weeklyHours * version.grossHourlyRate * WEEKS_PER_MONTH,
    });
  }

  return data.length
    ? FileHelper.exportToTxt([Object.keys(data[0]), ...data.map(d => Object.values(d))])
    : FileHelper.exportToTxt([]);
};

exports.exportContractEnds = async (query, credentials) => {
  const contractList = await Contract
    .find({
      endDate: { $lte: moment(query.endDate).endOf('d').toDate(), $gte: moment(query.startDate).startOf('d').toDate() },
      company: get(credentials, 'company._id'),
    })
    .populate({ path: 'user', select: 'serialNumber identity' })
    .lean();

  const data = [];
  for (const contract of contractList) {
    data.push({
      ap_soc: process.env.AP_SOC,
      ap_matr: get(contract, 'user.serialNumber') || '',
      fs_nom: get(contract, 'user.identity.lastname') || '',
      ap_contrat: contract.serialNumber || '',
      fs_mv_sortie: moment(contract.endDate).format('DD/MM/YYYY'),
      fs_mv_motif_s: FS_MV_MOTIF_S[contract.endReason] || '',
    });
  }

  return data.length
    ? FileHelper.exportToTxt([Object.keys(data[0]), ...data.map(d => Object.values(d))])
    : FileHelper.exportToTxt([]);
};
