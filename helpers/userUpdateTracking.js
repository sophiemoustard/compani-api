const User = require('../models/User');

exports.userUpdateTracking = async (byId, body) => {
  const modifiedBy = User.findById(byId);
  const trackingPayload = {
    date: Date.now(),
    updatedFields: [],
    by: `${modifiedBy.firstname} ${modifiedBy.lastname}`
  };
  for (const k in body) {
    trackingPayload.updatedFields.push({
      name: k,
      value: body[k]
    });
  }
  return trackingPayload;
};
