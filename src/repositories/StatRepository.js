const { ObjectId } = require('mongodb');
const Customer = require('../models/Customer');
const SectorHistory = require('../models/SectorHistory');
const {
  HOURLY,
  MONTHLY,
  INVOICED_AND_PAID,
  INVOICED_AND_NOT_PAID,
  INTERVENTION,
  INTERNAL_HOUR,
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

exports.getCustomersAndDurationBySector = async (sectors, month, companyId) => {
  const minStartDate = CompaniDate(month, 'MM-yyyy').startOf('month').toISO();
  const maxStartDate = CompaniDate(month, 'MM-yyyy').endOf('month').toISO();

  const sectorsCustomers = [
    {
      $match: {
        sector: { $in: sectors },
        startDate: { $lt: new Date(maxStartDate) },
        $or: [{ endDate: { $exists: false } }, { endDate: { $gt: new Date(minStartDate) } }],
      },
    },
    {
      $lookup: {
        from: 'referenthistories',
        as: 'histories',
        let: { referentId: '$auxiliary' },
        pipeline: [
          {
            $match: {
              $or: [{ endDate: { $exists: false } }, { endDate: { $exists: true, $gte: new Date(minStartDate) } }],
              startDate: { $lte: new Date(maxStartDate) },
              $and: [{ $expr: { $and: [{ $eq: ['$auxiliary', '$$referentId'] }] } }],
            },
          },
        ],
      },
    },
    { $unwind: { path: '$histories' } },
    {
      $project: {
        sector: 1,
        customer: '$histories.customer',
        startDate: { $max: ['$startDate', '$histories.startDate'] },
        endDate: { $min: ['$endDate', '$histories.endDate'] },
      },
    },
  ];

  const customersEvents = [
    {
      $lookup: {
        from: 'events',
        as: 'event',
        let: {
          customerId: '$customer',
          startDate: { $max: ['$startDate', new Date(minStartDate)] },
          endDate: { $min: [{ $ifNull: ['$endDate', new Date(maxStartDate)] }, new Date(maxStartDate)] },
        },
        pipeline: [
          {
            $match: {
              $or: [
                { isCancelled: false },
                { 'cancel.condition': { $in: [INVOICED_AND_NOT_PAID, INVOICED_AND_PAID] } },
              ],
              $expr: {
                $and: [
                  { $eq: ['$customer', '$$customerId'] },
                  { $gt: ['$endDate', '$$startDate'] },
                  { $lt: ['$startDate', '$$endDate'] },
                ],
              },
            },
          },
        ],
      },
    },
    { $unwind: { path: '$event' } },
  ];

  const group = [
    { $addFields: { duration: { $divide: [{ $subtract: ['$event.endDate', '$event.startDate'] }, 1000 * 60 * 60] } } },
    {
      $group: {
        _id: { sector: '$sector', customer: '$event.customer' },
        duration: { $sum: '$duration' },
        auxiliaries: { $addToSet: '$event.auxiliary' },
      },
    },
    { $addFields: { auxiliaryCount: { $size: '$auxiliaries' } } },
    {
      $group: {
        _id: '$_id.sector',
        duration: { $sum: '$duration' },
        customerCount: { $sum: 1 },
        auxiliaryCount: { $sum: '$auxiliaryCount' },
      },
    },
    {
      $project: {
        sector: '$_id',
        averageDuration: { $divide: ['$duration', '$customerCount'] },
        customerCount: 1,
        auxiliaryTurnOver: { $divide: ['$auxiliaryCount', '$customerCount'] },
      },
    },
  ];

  return SectorHistory.aggregate([
    ...sectorsCustomers,
    ...customersEvents,
    ...group,
  ]).option({ company: companyId });
};

exports.getIntenalAndBilledHoursBySector = async (sectors, month, companyId) => {
  const minStartDate = CompaniDate(month, 'MM-yyyy').startOf('month').toISO();
  const maxStartDate = CompaniDate(month, 'MM-yyyy').endOf('month').toISO();

  return SectorHistory.aggregate([
    {
      $match: {
        sector: { $in: sectors },
        startDate: { $lt: new Date(maxStartDate) },
        $or: [{ endDate: { $exists: false } }, { endDate: { $gt: new Date(minStartDate) } }],
      },
    },
    {
      $lookup: {
        from: 'events',
        as: 'event',
        let: {
          auxiliaryId: '$auxiliary',
          startDate: { $max: ['$startDate', new Date(minStartDate)] },
          endDate: { $min: [{ $ifNull: ['$endDate', new Date(maxStartDate)] }, new Date(maxStartDate)] },
        },
        pipeline: [
          {
            $match: {
              type: { $in: [INTERVENTION, INTERNAL_HOUR] },
              $or: [
                { isCancelled: false },
                { 'cancel.condition': { $in: [INVOICED_AND_NOT_PAID, INVOICED_AND_PAID] } },
              ],
              $expr: {
                $and: [
                  { $eq: ['$auxiliary', '$$auxiliaryId'] },
                  { $gt: ['$endDate', '$$startDate'] },
                  { $lt: ['$startDate', '$$endDate'] },
                ],
              },
            },
          },
        ],
      },
    },
    { $unwind: { path: '$event' } },
    {
      $addFields: {
        'event.duration': { $divide: [{ $subtract: ['$event.endDate', '$event.startDate'] }, 1000 * 60 * 60] },
      },
    },
    { $group: { _id: '$sector', events: { $push: '$event' } } },
    {
      $addFields: {
        internalHours: { $filter: { input: '$events', as: 'event', cond: { $eq: ['$$event.type', INTERNAL_HOUR] } } },
        interventions: { $filter: { input: '$events', as: 'event', cond: { $eq: ['$$event.type', INTERVENTION] } } },
      },
    },
    {
      $project: {
        sector: '$_id',
        internalHours: {
          $reduce: { input: '$internalHours', initialValue: 0, in: { $add: ['$$value', '$$this.duration'] } },
        },
        interventions: {
          $reduce: { input: '$interventions', initialValue: 0, in: { $add: ['$$value', '$$this.duration'] } },
        },
      },
    },
  ]).option({ company: companyId });
};
