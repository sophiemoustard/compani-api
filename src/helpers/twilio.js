const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const Company = require('../models/Company');

exports.sendMessage = async (to, body, credentials) => {
  const company = await Company.findOne({ _id: credentials.company._id }).lean();

  return twilio.messages.create({ to, from: company.tradeName, body });
};
