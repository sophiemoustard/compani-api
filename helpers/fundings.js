const Boom = require('boom');
const moment = require('moment');

const Customer = require('../models/Customer');
const { populateServices } = require('./subscriptions');
const { getLastVersion } = require('./utils');
const { DAYS_INDEX, FUNDING_FREQUENCIES, FUNDING_NATURES } = require('./constants');

const checkSubscriptionFunding = async (customerId, checkedFunding) => {
  const customer = await Customer.findOne({ _id: customerId }).lean();
  if (!customer) return Boom.notFound('Error while checking subscription funding: customer not found.');

  if (!customer.fundings || customer.fundings.length === 0) return true;

  /* We allow two fundings to have the same subscription only if :
  *     - the 2 fundings are not on the same period
  *     - or the 2 fundings are on the same period but not the same days
  */
  return customer.fundings
    .filter(fund => checkedFunding.subscription === fund.subscription.toHexString() && checkedFunding._id !== fund._id.toHexString())
    .every(fund =>
      (!!fund.endDate && moment(fund.endDate).isBefore(checkedFunding.startDate, 'day')) ||
        checkedFunding.careDays.every(day => !fund.careDays.includes(day)));
};

const populateFundings = async (funding, customer) => {
  if (!funding) return false;

  const sub = customer.subscriptions.find(sb => sb._id.toHexString() === funding.subscription.toHexString());
  if (sub.service.versions) {
    funding.subscription = { ...sub, service: await populateServices(sub.service) };
  } else {
    funding.subscription = { ...sub };
  }

  return funding;
};

const exportFundings = async () => {
  const customers = await Customer.aggregate([
    { $match: { fundings: { $exists: true, $not: { $size: 0 } } } },
    { $unwind: '$fundings' },
    {
      $addFields: {
        'fundings.subscription': {
          $filter: { input: '$subscriptions', as: 'sub', cond: { $eq: ['$$sub._id', '$fundings.subscription'] } },
        }
      }
    },
    { $unwind: '$fundings.subscription' },
    {
      $lookup: {
        from: 'services',
        localField: 'fundings.subscription.service',
        foreignField: '_id',
        as: 'fundings.subscription.service'
      }
    },
    { $unwind: { path: '$fundings.subscription.service' } },
    {
      $lookup: {
        from: 'thirdpartypayers',
        localField: 'fundings.thirdPartyPayer',
        foreignField: '_id',
        as: 'fundings.thirdPartyPayer'
      }
    },
    { $unwind: { path: '$fundings.thirdPartyPayer' } },
    {
      $project: { funding: '$fundings', identity: 1 },
    }
  ]);

  const data = [['Bénéficiaire', 'Tiers payeur', 'Nature', 'Service', 'Date de début', 'Date de fin', 'Numéro de dossier', 'Fréquence',
    'Montant TTC', 'Montant unitaire TTC', 'Nombre d\'heures', 'Jours', 'Participation du bénéficiaire']];
  for (const cus of customers) {
    const { funding } = cus;
    const lastServiceVersion = getLastVersion(funding.subscription.service.versions, 'startDate');
    const careDays = funding.careDays.map(dayIndex => DAYS_INDEX[dayIndex]);
    const frequency = FUNDING_FREQUENCIES.find(freq => freq.value === funding.frequency).label;
    const nature = FUNDING_NATURES.find(nat => nat.value === funding.nature).label;
    data.push([
      `${cus.identity.title} ${cus.identity.lastname}`, funding.thirdPartyPayer.name, nature, lastServiceVersion.name,
      funding.startDate && moment(funding.startDate).format('DD/MM/YYYY'), funding.endDate && moment(funding.endDate).format('DD/MM/YYYY'),
      funding.folderNumber, frequency, funding.amountTTC, funding.unitTTCRate, funding.careHours, careDays,
      funding.customerParticipationRate
    ]);
  }

  return data;
};

module.exports = {
  checkSubscriptionFunding,
  populateFundings,
  exportFundings,
};
