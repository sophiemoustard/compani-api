const Boom = require('boom');
const moment = require('moment');
const get = require('lodash/get');
const Customer = require('../models/Customer');
const { populateServices } = require('./subscriptions');
const UtilsHelper = require('./utils');
const { DAYS_INDEX, FUNDING_FREQUENCIES, FUNDING_NATURES, CIVILITY_LIST } = require('./constants');
const CustomerRepository = require('../repositories/CustomerRepository');

exports.checkSubscriptionFunding = async (customerId, companyId, checkedFunding) => {
  const customer = await Customer.findOne({ _id: customerId, company: companyId }).lean();
  if (!customer) return Boom.notFound('Error while checking subscription funding: customer not found.');

  if (!customer.fundings || customer.fundings.length === 0) return true;

  /* We allow two fundings to have the same subscription only if :
  *     - the 2 fundings are not on the same period
  *     - or the 2 fundings are on the same period but not the same days
  */
  return customer.fundings
    .filter(fund => checkedFunding.subscription === fund.subscription.toHexString() && checkedFunding._id !== fund._id.toHexString())
    .every((fund) => {
      const lastVersion = UtilsHelper.getLastVersion(fund.versions, 'createdAt');

      return (!!lastVersion.endDate && moment(lastVersion.endDate).isBefore(checkedFunding.versions[0].startDate, 'day')) ||
        checkedFunding.versions[0].careDays.every(day => !lastVersion.careDays.includes(day));
    });
};

exports.populateFundings = (funding, customer) => {
  if (!funding) return false;

  const sub = customer.subscriptions.find(sb => sb._id.toHexString() === funding.subscription.toHexString());
  if (get(sub, 'service.versions')) {
    funding.subscription = { ...sub, service: populateServices(sub.service) };
  } else {
    funding.subscription = { ...sub };
  }

  return funding;
};

const fundingExportHeader = [
  'Titre',
  'Nom',
  'Prénom',
  'Tiers payeur',
  'Nature',
  'Service',
  'Date de début',
  'Date de fin',
  'Numéro de dossier',
  'Fréquence',
  'Montant TTC',
  'Montant unitaire TTC',
  'Nombre d\'heures',
  'Jours',
  'Participation du bénéficiaire',
];

exports.exportFundings = async () => {
  const customerFundings = await CustomerRepository.getCustomerFundings();
  const data = [fundingExportHeader];

  for (const cus of customerFundings) {
    const fundInfo = [];
    if (cus.identity) {
      fundInfo.push(
        CIVILITY_LIST[get(cus, 'identity.title')] || '',
        get(cus, 'identity.lastname', '').toUpperCase(),
        get(cus, 'identity.firstname', '')
      );
    } else fundInfo.push('', '', '');

    let { funding } = cus;
    if (!funding) fundInfo.push('', '', '', '', '', '', '', '', '', '', '', '');
    else {
      funding = UtilsHelper.mergeLastVersionWithBaseObject(funding, 'createdAt');

      const nature = FUNDING_NATURES.find(nat => nat.value === funding.nature);
      const lastServiceVersion = funding.subscription && funding.subscription.service && funding.subscription.service.versions
        ? UtilsHelper.getLastVersion(funding.subscription.service.versions, 'startDate')
        : null;
      const frequency = FUNDING_FREQUENCIES.find(freq => freq.value === funding.frequency);
      let careDays = '';
      if (funding.careDays) {
        funding.careDays.map((dayIndex) => {
          careDays = careDays.concat(`${DAYS_INDEX[dayIndex]} `);
        });
      }

      fundInfo.push(
        funding.thirdPartyPayer ? (funding.thirdPartyPayer.name || '') : '',
        nature ? nature.label : '',
        lastServiceVersion ? lastServiceVersion.name : '',
        funding.startDate ? moment(funding.startDate).format('DD/MM/YYYY') : '',
        funding.endDate ? moment(funding.endDate).format('DD/MM/YYYY') : '',
        funding.folderNumber || '',
        frequency ? frequency.label : '',
        UtilsHelper.formatFloatForExport(funding.amountTTC),
        UtilsHelper.formatFloatForExport(funding.unitTTCRate),
        UtilsHelper.formatFloatForExport(funding.careHours),
        careDays || '',
        UtilsHelper.formatFloatForExport(funding.customerParticipationRate)
      );
    }

    data.push(fundInfo);
  }

  return data;
};
