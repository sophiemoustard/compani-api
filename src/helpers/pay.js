const moment = require('moment');
const get = require('lodash/get');
const pick = require('lodash/pick');

const Pay = require('../models/Pay');
const FinalPay = require('../models/FinalPay');
const utils = require('./utils');
const { SURCHARGES, END_CONTRACT_REASONS, CIVILITY_LIST } = require('./constants');

const formatSurchargeDetail = (detail) => {
  const surchargeDetail = [];
  for (const key of Object.keys(detail)) {
    surchargeDetail.push({ ...detail[key], planId: key });
  }

  return surchargeDetail;
};

exports.formatPay = (draftPay) => {
  const payload = { ...draftPay };
  if (draftPay.surchargedAndNotExemptDetails) {
    payload.surchargedAndNotExemptDetails = formatSurchargeDetail(draftPay.surchargedAndNotExemptDetails);
  }
  if (draftPay.surchargedAndExemptDetails) {
    payload.surchargedAndExemptDetails = formatSurchargeDetail(draftPay.surchargedAndExemptDetails);
  }

  return payload;
};

exports.createPayList = async (payToCreate) => {
  const list = [];
  for (const pay of payToCreate) {
    list.push(new Pay(this.formatPay(pay)));
  }

  await Pay.insertMany(list);
};

exports.formatSurchargedDetailsForExport = (surchargedDetails) => {
  if (!surchargedDetails) return '';

  const formattedPlans = [];

  for (const surchargedPlanDetails of surchargedDetails) {
    const surchages = Object.entries(pick(surchargedPlanDetails, Object.keys(SURCHARGES)));
    if (surchages.length === 0) continue;

    const lines = [surchargedPlanDetails.planName];

    for (const [surchageKey, surcharge] of surchages) {
      lines.push(`${SURCHARGES[surchageKey]}, ${surcharge.percentage}%, ${utils.formatFloatForExport(surcharge.hours)}h`);
    }
    formattedPlans.push(lines.join('\r\n'));
  }

  return formattedPlans.join('\r\n\r\n');
};

const payExportHeader = [
  'Titre',
  'Prénom',
  'Nom',
  'Equipe',
  'Date d\'embauche',
  'Début',
  'Date de notif',
  'Motif',
  'Fin',
  'Heures contrat',
  'Heures travaillées',
  'Dont exo non majo',
  'Dont exo et majo',
  'Détails des majo exo',
  'Dont non exo et non majo',
  'Dont non exo et majo',
  'Détails des majo non exo',
  'Solde heures',
  'Compteur',
  'Heures sup à payer',
  'Heures comp à payer',
  'Mutuelle',
  'Transport',
  'Autres frais',
  'Prime',
  'Indemnité',
];

const getHiringDate = (contracts) => {
  if (!contracts || contracts.length === 0) return;
  if (contracts.length === 1) return contracts[0].startDate;

  return contracts.map(contract => contract.startDate).sort((a, b) => new Date(a) - new Date(b))[0];
};

exports.exportPayAndFinalPayHistory = async (startDate, endDate) => {
  const query = {
    endDate: { $lte: moment(endDate).endOf('M').toDate() },
    startDate: { $gte: moment(startDate).startOf('M').toDate() },
  };

  const pays = await Pay.find(query)
    .sort({ startDate: 'desc' })
    .populate({ path: 'auxiliary', select: 'identity sector contracts', populate: [{ path: 'sector', select: 'name' }, { path: 'contracts' }] })
    .lean();

  const finalPays = await FinalPay.find(query)
    .sort({ startDate: 'desc' })
    .populate({ path: 'auxiliary', select: 'identity sector contracts', populate: [{ path: 'sector', select: 'name' }, { path: 'contracts' }] })
    .lean();

  const rows = [payExportHeader];
  const paysAndFinalPay = [...pays, ...finalPays];
  for (const pay of paysAndFinalPay) {
    const hiringDate = getHiringDate(pay.auxiliary.contracts);
    const cells = [
      CIVILITY_LIST[get(pay, 'auxiliary.identity.title')] || '',
      get(pay, 'auxiliary.identity.firstname') || '',
      get(pay, 'auxiliary.identity.lastname').toUpperCase() || '',
      get(pay.auxiliary, 'sector.name') || '',
      hiringDate ? moment(hiringDate).format('DD/MM/YYYY') : '',
      moment(pay.startDate).format('DD/MM/YYYY'),
      pay.endNotificationDate ? moment(pay.endNotificationDate).format('DD/MM/YYYY') : '',
      pay.endReason ? END_CONTRACT_REASONS[pay.endReason] : '',
      moment(pay.endDate).format('DD/MM/YYYY'),
      utils.formatFloatForExport(pay.contractHours),
      utils.formatFloatForExport(pay.workedHours),
      utils.formatFloatForExport(pay.notSurchargedAndExempt),
      utils.formatFloatForExport(pay.surchargedAndExempt),
      exports.formatSurchargedDetailsForExport(pay.surchargedAndExemptDetails),
      utils.formatFloatForExport(pay.notSurchargedAndNotExempt),
      utils.formatFloatForExport(pay.surchargedAndNotExempt),
      exports.formatSurchargedDetailsForExport(pay.surchargedAndNotExemptDetails),
      utils.formatFloatForExport(pay.hoursBalance),
      utils.formatFloatForExport(pay.hoursCounter),
      utils.formatFloatForExport(pay.overtimeHours),
      utils.formatFloatForExport(pay.additionalHours),
      pay.mutual ? 'Oui' : 'Non',
      utils.formatFloatForExport(pay.transport),
      utils.formatFloatForExport(pay.otherFees),
      utils.formatFloatForExport(pay.bonus),
      pay.compensation ? utils.formatFloatForExport(pay.compensation) : '0,00',
    ];

    rows.push(cells);
  }

  return rows;
};
