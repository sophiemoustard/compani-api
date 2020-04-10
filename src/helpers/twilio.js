const Company = require('../models/Company');

let twilio;
if (process.env.NODE_ENV !== 'test') {
  twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

exports.sendMessage = async (to, body, credentials) => {
  const company = await Company.findOne({ _id: credentials.company._id }).lean();

  return twilio.messages.create({ to, from: company.tradeName, body });
};

exports.send = async ({ to, from, body }) => twilio.messages.create({ to, from, body });
