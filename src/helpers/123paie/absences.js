const get = require('lodash/get');
const moment = require('moment');
const fs = require('fs');
const FileHelper = require('../file');
const ZipHelper = require('../zip');
const {
  ABSENCE,
  DAILY,
  HOURLY,
  PAID_LEAVE,
  UNPAID_LEAVE,
  MATERNITY_LEAVE,
  PATERNITY_LEAVE,
  PARENTAL_LEAVE,
  ILLNESS,
  UNJUSTIFIED,
  WORK_ACCIDENT,
  TRANSPORT_ACCIDENT,
} = require('../constants');
const HistoryExportHelper = require('../historyExport');
const Event = require('../../models/Event');
const Pay = require('../../models/Pay');

const fsPromises = fs.promises;

const NIC_LENGHT = 5;
const VA_ABS_CODE = {
  [PAID_LEAVE]: 'CPL',
  [UNPAID_LEAVE]: 'CSS',
  [MATERNITY_LEAVE]: 'MAT',
  [PATERNITY_LEAVE]: 'PAT',
  [PARENTAL_LEAVE]: 'CPE',
  [ILLNESS]: 'MAL',
  [UNJUSTIFIED]: 'ANN',
  [WORK_ACCIDENT]: 'ATW',
  [TRANSPORT_ACCIDENT]: 'ATR',
};

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
      select: 'serialNumber identity',
      populate: [{ path: 'contracts' }, { path: 'establishment' }],
    })
    .populate({ path: 'extension', select: 'startDate' }) // initial absences must be before its extensions
    .sort({ startDate: 1 })
    .lean();
};

exports.exportAbsences = async (query, credentials) => {
  const absences = await exports.getAbsences(query, credentials);

  const data = [];
  for (const abs of absences) {
    const matchingContract = abs.auxiliary.contracts.find((c) => {
      if (c.endDate) return moment(abs.startDate).isBetween(c.startDate, c.endDate, 'd', '[]');

      return moment(abs.startDate).isSameOrAfter(c.startDate, 'd');
    });

    const absenceInfo = {
      ap_soc: process.env.AP_SOC,
      ap_etab: (get(abs, 'auxiliary.establishment.siret') || '').slice(-NIC_LENGHT),
      ap_matr: abs.auxiliary.serialNumber || '',
      fs_nom: get(abs, 'auxiliary.identity.lastname') || '',
      ap_contrat: matchingContract.serialNumber || '',
      va_abs_code: VA_ABS_CODE[abs.absence],
      va_abs_deb: moment(abs.startDate).format('DD/MM/YYYY'),
      va_abs_fin: moment(abs.endDate).format('DD/MM/YYYY'),
      va_abs_premier_arret: abs.extension ? '0' : '1',
      va_abs_prolongation: abs.extension
        ? moment(abs.extension.startDate).format('DD/MM/YYYY')
        : moment(abs.startDate).format('DD/MM/YYYY'),
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
      data.push({
        ...absenceInfo,
        va_abs_date: moment(day).format('DD/MM/YYYY'),
        va_abs_nb22: [1, 2, 3, 4, 5].includes(moment(day).isoWeekday()) ? 1 : 0,
        va_abs_nb26: [1, 2, 3, 4, 5, 6].includes(moment(day).isoWeekday()) ? 1 : 0,
        va_abs_nb30: 1,
        va_abs_nbh: HistoryExportHelper.getAbsenceHours(formattedAbsence, [matchingContract]),
      });
    }
  }

  const file = data.length
    ? await FileHelper.exportToTxt([Object.keys(data[0]), ...data.map(d => Object.values(d))])
    : await FileHelper.exportToTxt([]);

  return ZipHelper.generateZip(
    'absences.zip',
    await Promise.all([{ name: 'absence.txt', file: fs.createReadStream(file) }])
  );
};
