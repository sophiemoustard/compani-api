const Event = require('../models/Event');

exports.getDraftPay = async (rules) => {
  const events = await Event.aggregate([
    { $match: { $and: rules } },
    { $group: { _id: '$auxiliary', events: { $push: '$$ROOT' } } },
  ]);

  return events;
};
