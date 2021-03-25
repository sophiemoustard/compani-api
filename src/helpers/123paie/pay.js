const get = require('lodash/get');
const { ObjectID } = require('mongodb');
const UtilsHelper = require('../utils');
const FileHelper = require('../file');
const Pay = require('../../models/Pay');

const VA_SAI_REPORT = 'T';
const MODE_BASE = 'base';
const MODE_RESULTAT = 'resultat';

const compute = (pay, variable, mode) => {
  if (variable.mode !== mode) return '';

  if (variable.keys) return computeKeys(pay, variable.keys);

  if (variable.func) return variable.func(pay);

  return '';
};

const computeDetailWithDiff = (details, keys) => details.reduce(
  (acc, d) => acc + keys.reduce((sum, k) => sum + get(d[k], 'hours') || 0, 0),
  0
);

const computeSurchargeAndExempt = (pay, keys) => {
  const surchargedAndExempt = get(pay, 'surchargedAndExemptDetails') || [];
  const surchargedAndExemptDiff = get(pay, 'diff.surchargedAndExemptDetails') || [];

  return computeDetailWithDiff(surchargedAndExempt, keys) + computeDetailWithDiff(surchargedAndExemptDiff, keys);
};

const computeKeys = (pay, keys) => keys.reduce((acc, key) => acc + UtilsHelper.computeHoursWithDiff(pay, key), 0);

const payVariables = [
  { code: '090', mode: MODE_BASE, keys: ['notSurchargedAndExempt'], name: 'Heures exo non majo' },
  { code: '255', mode: MODE_BASE, keys: ['notSurchargedAndExempt', 'surchargedAndExempt'], name: 'Heures exo total' },
  {
    code: '145',
    mode: MODE_BASE,
    func: p => computeSurchargeAndExempt(p, ['sunday']),
    name: 'Heures exo maj dimanche',
  },
  {
    code: '167',
    mode: MODE_BASE,
    func: p => computeSurchargeAndExempt(p, ['publicHoliday']),
    name: 'Heures exo maj ferié',
  },
  {
    code: '173',
    mode: MODE_BASE,
    func: p => computeSurchargeAndExempt(p, ['firstOfMay', 'firstOfJanuary', 'twentyFifthOfDecember']),
    name: 'Heures exo maj 100%',
  },
  { code: '200', mode: MODE_BASE, func: p => computeSurchargeAndExempt(p, ['evening']), name: 'Heures exo maj soirée' },
  { code: '177', mode: MODE_BASE, keys: ['notSurchargedAndNotExempt'], name: 'Heures non exo non majo' },
  { code: '115', mode: MODE_BASE, keys: ['overtimeHours'], name: 'Heures supplémentaires' },
  { code: '100', mode: MODE_BASE, keys: ['additionalHours'], name: 'Heures complémentaires' },
  { code: '430', mode: MODE_RESULTAT, keys: [''], name: 'Carte navigo' },
  { code: '512', mode: MODE_RESULTAT, keys: ['phoneFees'], name: 'Frais téléphoniques' },
  { code: '489', mode: MODE_RESULTAT, keys: ['transport'], name: 'Frais kilométriques' },
];

exports.exportPay = async () => {
  const pay = await Pay.findOne({ auxiliary: new ObjectID('5f50d5157a1fca0015829169'), month: '02-2021' })
    .populate({
      path: 'auxiliary',
      populate: { path: 'contracts', select: '_id serialNumber' },
      select: '_id serialNumber',
    })
    .lean();

  const data = [];
  for (const variable of payVariables) {
    data.push({
      ap_soc: process.env.AP_SOC,
      ap_matr: get(pay, 'auxiliary.serialNumber') || '',
      ap_contrat: get(pay, 'auxiliary.contract.serialNumber') || '',
      va_sai_report: VA_SAI_REPORT,
      va_sai_code: variable.code,
      va_sai_lib: variable.name,
      va_sai_base: compute(pay, variable, MODE_BASE),
      va_sai_resultat: compute(pay, variable, MODE_RESULTAT),
      va_sai_taux: '',
    });
  }

  return data.length
    ? FileHelper.exportToTxt([Object.keys(data[0]), ...data.map(d => Object.values(d))])
    : FileHelper.exportToTxt([]);
};
