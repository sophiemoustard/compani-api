const moment = require('moment');
const get = require('lodash/get');
const Service = require('../models/Service');
const UtilsHelper = require('./utils');
const { CONTRACT_STATUS_LIST, SERVICE_NATURES } = require('./constants.js');

exports.exportServices = async (credentials) => {
  const companyId = get(credentials, 'company._id', null);
  const services = await Service.find({ company: companyId })
    .populate('company')
    .populate({ path: 'versions.surcharge', match: { company: companyId } });
  const data = [['Nature', 'Type', 'Entrepise', 'Nom', 'Montant unitaire par défaut', 'TVA (%)', 'Plan de majoration',
    'Date de début', 'Date de creation', 'Date de mise a jour']];
  for (const service of services) {
    const lastVersion = UtilsHelper.getLastVersion(service.versions, 'startDate');
    data.push([
      SERVICE_NATURES.find(nat => nat.value === service.nature).label,
      CONTRACT_STATUS_LIST[service.type],
      service.company.name,
      lastVersion.name,
      UtilsHelper.formatFloatForExport(lastVersion.defaultUnitAmount),
      UtilsHelper.formatFloatForExport(lastVersion.vat),
      lastVersion.surcharge ? lastVersion.surcharge.name : '',
      moment(lastVersion.startDate).format('DD/MM/YYYY'),
      moment(service.createdAt).format('DD/MM/YYYY'),
      moment(service.updatedAt).format('DD/MM/YYYY')]);
  }

  return data;
};
