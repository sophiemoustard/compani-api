const populateReferentHistories = [
  { $lookup: { from: 'referenthistories', as: 'histories', foreignField: 'customer', localField: '_id' } },
  { $unwind: { path: '$histories', preserveNullAndEmptyArrays: true } },
  { $lookup: { from: 'users', as: 'histories.auxiliary', foreignField: '_id', localField: 'histories.auxiliary' } },
  { $unwind: { path: '$histories.auxiliary', preserveNullAndEmptyArrays: true } },
  {
    $group: {
      _id: '$_id',
      customer: { $first: '$$ROOT' },
      histories: { $push: '$histories' },
    },
  },
  {
    $addFields: {
      'customer.referentHistories': {
        $filter: { input: '$histories', as: 'rh', cond: { $not: { $eq: [{}, '$$rh'] } } },
      },
    },
  },
  { $replaceRoot: { newRoot: '$customer' } },
];

module.exports = {
  populateReferentHistories,
};
