const moment = require('moment');
const _ = require('lodash');

const FinalPay = require('../models/FinalPay');
const utils = require('./utils');
const { END_CONTRACT_REASONS } = require('./constants');

exports.exportFinalPayHistory = async (startDate, endDate) => {
  const query = {
    endDate: { $lte: moment(endDate).endOf('d').toDate() },
    startDate: { $gte: moment(startDate).startOf('d').toDate() },
  };

  const finalPays = await FinalPay.find(query)
    .sort({ startDate: 'desc' })
    .populate({ path: 'auxiliary', select: 'identity sector', populate: { path: 'sector', select: 'name' } });

  const header = [
    'Auxiliaire',
    'Equipe',
    'Début',
    'Date de notif',
    'Motif',
    'Fin',
    'Heures contrat',
    'Heures travaillées',
    'Dont exo non majo',
    'Dont exo et majo',
    'Dont non exo et non majo',
    'Dont non exo et majo',
    'Solde heures',
    'Compteur',
    'Heures sup à payer',
    'Heures comp à payer',
    'Mutuelle',
    'Transport',
    'Autres frais',
    'Prime',
    'Indemnité'
  ];

  const rows = [header];

  for (const finalPay of finalPays) {
    const cells = [
      utils.getFullTitleFromIdentity(_.get(finalPay.auxiliary, 'identity') || {}),
      _.get(finalPay.auxiliary, 'sector.name') || '',
      moment(finalPay.startDate).format('DD/MM/YYYY'),
      moment(finalPay.endNotificationDate).format('DD/MM/YYYY'),
      END_CONTRACT_REASONS[finalPay.endReason] || '',
      moment(finalPay.endDate).format('DD/MM/YYYY'),
      utils.formatFloatForExport(finalPay.contractHours),
      utils.formatFloatForExport(finalPay.workedHours),
      utils.formatFloatForExport(finalPay.notSurchargedAndExempt),
      utils.formatFloatForExport(finalPay.surchargedAndExempt),
      utils.formatFloatForExport(finalPay.notSurchargedAndNotExempt),
      utils.formatFloatForExport(finalPay.surchargedAndNotExempt),
      utils.formatFloatForExport(finalPay.hoursBalance),
      utils.formatFloatForExport(finalPay.hoursCounter),
      utils.formatFloatForExport(finalPay.overtimeHours),
      utils.formatFloatForExport(finalPay.additionalHours),
      finalPay.mutual ? 'Oui' : 'Non',
      utils.formatFloatForExport(finalPay.transport),
      utils.formatFloatForExport(finalPay.otherFees),
      utils.formatFloatForExport(finalPay.bonus),
      utils.formatFloatForExport(finalPay.compensation),
    ];

    rows.push(cells);
  }

  return rows;
};
