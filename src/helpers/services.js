const Service = require('../models/Service');

exports.update = async (id, payload) => {
  if (payload.isArchived) return Service.updateOne({ _id: id }, payload);
  return Service.updateOne({ _id: id }, { $push: { versions: payload } });
};
