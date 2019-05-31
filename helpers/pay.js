const moment = require('moment');
const _ = require('lodash');

const Pay = require('../models/Pay');
const utils = require('./utils');

exports.exportPayHistory = async (startDate, endDate) => {
  const query = {
    endDate: { $lte: moment(endDate).endOf('M').endOf('d').toDate() },
    startDate: { $gte: moment(startDate).startOf('M').startOf('d').toDate() },
  };

  const pays = await Pay.find(query)
    .sort({ startDate: 'desc' })
    .populate({ path: 'auxiliary', select: 'identity sector', populate: { path: 'sector', select: 'name' } });

  const header = [
    'Auxiliaire',
    'Equipe',
    'Début',
    'Fin',
    'Heures contrat',
    'Total heures travaillées',
    'Dont exo SAP non majorées',
    'Dont majorées et exo SAP',
    'Dont non majorées non exo SAP',
    'Dont majorées et non exo SAP',
    'Solde heures période',
    'Compteur d\'heures',
    'Heures sup à payer',
    'Heures complémentaires à payer',
    'Mutuelle',
    'Transport',
    'Autres frais',
    'Prime',
  ];

  const rows = [header];

  for (const pay of pays) {
    const cells = [
      utils.getFullTitleFromIdentity(_.get(pay.auxiliary, 'identity') || {}),
      _.get(pay.auxiliary, 'sector.name') || '',
      moment(pay.startDate).format('DD/MM/YYYY'),
      moment(pay.endDate).format('DD/MM/YYYY'),
      pay.contractHours || '',
      pay.workedHours || '',
      pay.notSurchargedAndExempt || '',
      pay.surchargedAndExempt || '',
      pay.notSurchargedAndNotExempt || '',
      pay.surchargedAndNotExmpt || '',
      pay.hoursBalance || '',
      pay.hoursCounter || '',
      pay.overtimeHours || '',
      pay.additionalHours || '',
      pay.mutual ? 'Oui' : 'Non',
      pay.transport || '',
      pay.otherFees || '',
      pay.bonus || '',
    ];

    rows.push(cells);
  }

  return rows;
};
