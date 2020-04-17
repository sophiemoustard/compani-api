const populateReferentHistories = [
  {
    $lookup: {
      from: 'referenthistories',
      as: 'referentHistories',
      foreignField: 'customer',
      localField: '_id',
    },
  },
  { $unwind: { path: '$referentHistories', preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: 'users',
      as: 'referentHistories.auxiliary',
      foreignField: '_id',
      localField: 'referentHistories.auxiliary',
    },
  },
  { $unwind: { path: '$referentHistories.auxiliary', preserveNullAndEmptyArrays: true } },
  {
    $group: {
      _id: '$_id',
      customer: { $first: '$$ROOT' },
      referentHistories: { $addToSet: '$referentHistories' },
    },
  },
  { $addFields: { 'customer.referentHistories': '$referentHistories' } },
  { $replaceRoot: { newRoot: '$customer' } },
];

module.exports = {
  populateReferentHistories,
};
