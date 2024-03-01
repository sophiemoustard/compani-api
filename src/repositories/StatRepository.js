const { ObjectId } = require('mongodb');
const Customer = require('../models/Customer');
const {
  HOURLY,
  MONTHLY,
  INVOICED_AND_PAID,
  INVOICED_AND_NOT_PAID,
  INTERVENTION,
} = require('../helpers/constants');
const { CompaniDate } = require('../helpers/dates/companiDates');

const getVersionMatch = fundingsDate => ({
  startDate: { $lte: new Date(fundingsDate.maxStartDate) },
  $or: [
    { endDate: null },
    { endDate: { $gte: new Date(fundingsDate.minEndDate) } },
  ],
});

const getFundingsMatch = () => ({
  frequency: MONTHLY,
  nature: HOURLY,
});

const getPopulatedFundings = (fundingsMatch, fundingsDate) => [
  { $replaceRoot: { newRoot: '$fundings' } },
  { $addFields: { version: { $arrayElemAt: ['$versions', -1] } } },
  {
    $match: {
      ...fundingsMatch,
      'version.startDate': { $lte: new Date(fundingsDate.maxStartDate) },
      $or: [
        { 'version.endDate': null },
        { 'version.endDate': { $gte: new Date(fundingsDate.minEndDate) } },
      ],
    },
  },
  { $lookup: { from: 'thirdpartypayers', localField: 'thirdPartyPayer', foreignField: '_id', as: 'thirdPartyPayer' } },
  { $unwind: { path: '$thirdPartyPayer' } },
];

const getMatchEvents = eventsDate => [
  {
    $lookup: {
      from: 'events',
      as: 'events',
      let: { subscriptionId: '$subscription' },
      pipeline: [
        {
          $match: {
            $and: [
              { startDate: { $gte: new Date(eventsDate.minDate) } },
              { endDate: { $lte: new Date(eventsDate.maxDate) } },
              { type: INTERVENTION },
              { $expr: { $and: [{ $eq: ['$subscription', '$$subscriptionId'] }] } },
              {
                $or: [
                  { isCancelled: false },
                  { 'cancel.condition': INVOICED_AND_PAID },
                  { 'cancel.condition': INVOICED_AND_NOT_PAID },
                ],
              },
            ],
          },
        },
      ],
    },
  },
];

exports.getEventsGroupedByFundings = async (customerId, fundingsDate, eventsDate, companyId) => {
  const versionMatch = getVersionMatch(fundingsDate);
  const fundingsMatch = getFundingsMatch();

  const matchFundings = [
    {
      $match: {
        _id: new ObjectId(customerId),
        fundings: { $elemMatch: { ...fundingsMatch, versions: { $elemMatch: versionMatch } } },
      },
    },
    { $unwind: { path: '$fundings' } },
  ];

  const startOfMonth = CompaniDate().startOf('month').toISO();
  const formatFundings = [
    {
      $addFields: {
        prevMonthEvents: {
          $filter: { input: '$events', as: 'event', cond: { $lt: ['$$event.startDate', new Date(startOfMonth)] } },
        },
        currentMonthEvents: {
          $filter: { input: '$events', as: 'event', cond: { $gte: ['$$event.startDate', new Date(startOfMonth)] } },
        },
      },
    },
    {
      $project: {
        thirdPartyPayer: { name: 1 },
        subscription: 1,
        startDate: '$version.startDate',
        endDate: '$version.endDate',
        careHours: '$version.careHours',
        careDays: '$version.careDays',
        prevMonthEvents: { startDate: 1, endDate: 1 },
        currentMonthEvents: { startDate: 1, endDate: 1 },
      },
    },
  ];

  return Customer
    .aggregate([
      ...matchFundings,
      ...getPopulatedFundings(fundingsMatch, fundingsDate),
      ...getMatchEvents(eventsDate),
      ...formatFundings,
    ])
    .option({ company: companyId });
};
