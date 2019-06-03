const moment = require('moment');
const _ = require('lodash');

const FinalPay = require('../models/FinalPay');
const utils = require('./utils');
const { END_CONTRACT_REASONS } = require('./constants');

exports.exportFinalPayHistory = async (startDate, endDate) => {
  const query = {
    endDate: { $lte: moment(endDate).endOf('M').toDate() },
    startDate: { $gte: moment(startDate).startOf('M').toDate() },
  };

  const finalPays = await FinalPay.find(query)
    .sort({ startDate: 'desc' })
    .populate({ path: 'auxiliary', select: 'identity sector', populate: { path: 'sector', select: 'name' } });

  const header = [
    'Auxiliaire',
    'Equipe',
    'Début de STC',
    'Date de notification',
    'Motif',
    'Fin de contrat',
    'Heures contrat',
    'Total heures travaillées',
    'Dont exo SAP non majorées',
    'Dont majorées et exo SAP',
    'Dont non majorées et non exo SAP',
    'Dont majorées et non exo SAP',
    'Solde heures période',
    'Compteur d\'heures',
    'Heures sup à payer',
    'Heures complémentaires à payer',
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
      utils.formatFloatForExport(finalPay.surchargedAndNotExmpt),
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
