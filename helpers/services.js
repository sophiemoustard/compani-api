const moment = require('moment');
const Service = require('../models/Service');
const { getLastVersion, formatFloatForExport } = require('./utils');
const { CONTRACT_TYPES, SERVICE_NATURES } = require('./constants.js');

exports.exportServices = async () => {
  const services = await Service.find().populate('company').populate('versions.surcharge');
  const data = [['Nature', 'Type', 'Entrepise', 'Nom', 'Montant unitaire par défaut', 'TVA (%)', 'Plan de majoration',
    'Date de début', 'Date de creation', 'Date de mise a jour']];
  for (const service of services) {
    const lastVersion = getLastVersion(service.versions, 'startDate');
    data.push([
      SERVICE_NATURES.find(nat => nat.value === service.nature).label,
      CONTRACT_TYPES.find(type => type.value === service.type).label,
      service.company.name,
      lastVersion.name,
      formatFloatForExport(lastVersion.defaultUnitAmount),
      formatFloatForExport(lastVersion.vat),
      lastVersion.surcharge ? lastVersion.surcharge.name : '',
      moment(lastVersion.startDate).format('DD/MM/YYYY'),
      moment(service.createdAt).format('DD/MM/YYYY'),
      moment(service.updatedAt).format('DD/MM/YYYY')]);
  }

  return data;
};
