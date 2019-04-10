const Event = require('../models/Event');

const updateEventBillingStatus = async (eventsToUpdate, isBilled) => {
  const promises = [];
  for (const id of eventsToUpdate) {
    promises.push(Event.findOneAndUpdate({ _id: id }, { $set: { isBilled } }));
  }
  await Promise.all(promises);
};

module.exports = {
  updateEventBillingStatus,
};