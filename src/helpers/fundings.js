const Boom = require('boom');
const moment = require('moment');
const get = require('lodash/get');
const has = require('lodash/has');
const Customer = require('../models/Customer');
const { populateServices } = require('./subscriptions');
const UtilsHelper = require('./utils');
const translate = require('./translate');
const { DAYS_INDEX, FUNDING_FREQUENCIES, FUNDING_NATURES, CIVILITY_LIST } = require('./constants');
const CustomerRepository = require('../repositories/CustomerRepository');

const { language } = translate;

exports.checkSubscriptionFunding = async (customerId, checkedFunding) => {
  const customer = await Customer.findOne({ _id: customerId }).lean();
  if (!customer) throw Boom.notFound('Error while checking subscription funding: customer not found.');

  if (!customer.fundings || customer.fundings.length === 0) return true;

  /* We allow two fundings to have the same subscription only if :
  *     - the 2 fundings are not on the same period
  *     - or the 2 fundings are on the same period but not the same days
  */
  return customer.fundings
    .filter(fund => checkedFunding.subscription === fund.subscription.toHexString() &&
      checkedFunding._id !== fund._id.toHexString())
    .every((fund) => {
      const lastVersion = UtilsHelper.getLastVersion(fund.versions, 'createdAt');

      const checkedFundingIsAfter = !!lastVersion.endDate &&
        moment(checkedFunding.versions[0].startDate).isAfter(lastVersion.endDate, 'day');
      const noCareDaysInCommon = checkedFunding.versions[0].careDays.every(day => !lastVersion.careDays.includes(day));
      const checkedFundingIsBefore = !!checkedFunding.versions[0].endDate &&
        moment(checkedFunding.versions[0].endDate).isBefore(lastVersion.startDate, 'day');

      return checkedFundingIsAfter || checkedFundingIsBefore || noCareDaysInCommon;
    });
};

exports.populateFundingsList = (customer) => {
  if (!customer.fundings) return customer;

  return {
    ...customer,
    fundings: customer.fundings.map(fund => exports.populateFunding(fund, customer.subscriptions)),
  };
};

exports.populateFunding = (funding, subscriptions) => {
  if (!funding) return false;

  const sub = subscriptions.find(sb => sb._id.toHexString() === funding.subscription.toHexString());
  if (has(sub, 'service.versions')) funding.subscription = { ...sub, service: populateServices(sub.service) };
  else funding.subscription = { ...sub };

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

exports.exportFundings = async (credentials) => {
  const customerFundings = await CustomerRepository.getCustomerFundings(get(credentials, 'company._id', null));
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
      const lastServiceVersion = has(funding, 'subscription.service.versions')
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

exports.createFunding = async (customerId, payload) => {
  const check = await exports.checkSubscriptionFunding(customerId, payload);
  if (!check) throw Boom.conflict(translate[language].customerFundingConflict);

  const customer = await Customer.findOneAndUpdate(
    { _id: customerId },
    { $push: { fundings: payload } },
    { new: true, select: { identity: 1, fundings: 1, subscriptions: 1 }, autopopulate: false }
  )
    .populate({ path: 'subscriptions.service' })
    .populate({ path: 'fundings.thirdPartyPayer' })
    .lean();

  return exports.populateFundingsList(customer);
};

exports.updateFunding = async (customerId, fundingId, payload) => {
  const checkFundingPayload = { _id: fundingId, subscription: payload.subscription, versions: [payload] };
  const check = await exports.checkSubscriptionFunding(customerId, checkFundingPayload);
  if (!check) return Boom.conflict(translate[language].customerFundingConflict);

  const customer = await Customer.findOneAndUpdate(
    { _id: customerId, 'fundings._id': fundingId },
    { $push: { 'fundings.$.versions': payload } },
    { new: true, select: { identity: 1, fundings: 1, subscriptions: 1 }, autopopulate: false }
  )
    .populate({ path: 'subscriptions.service' })
    .populate({ path: 'fundings.thirdPartyPayer' })
    .lean();

  return exports.populateFundingsList(customer);
};

exports.deleteFunding = async (customerId, fundingId) => Customer.updateOne(
  { _id: customerId },
  { $pull: { fundings: { _id: fundingId } } }
);
