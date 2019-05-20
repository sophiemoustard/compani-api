const Event = require('../models/Event');

exports.getDraftPay = async (rules) => {
  const events = await Event.aggregate([
    { $match: { $and: rules } },
    { $group: { _id: '$auxiliary', events: { $push: '$$ROOT' } } },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'auxiliary',
      },
    },
    { $unwind: { path: '$auxiliary' } },
    {
      $lookup: {
        from: 'sectors',
        localField: 'auxiliary.sector',
        foreignField: '_id',
        as: 'auxiliary.sector',
      },
    },
    { $unwind: { path: '$auxiliary.sector' } },
    { $project: { auxiliary: { _id: 1, identity: 1, sector: 1 }, events: 1 } },
  ]);

  return events;
};
