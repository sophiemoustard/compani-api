const Company = require('../models/Company');
const axios = require('axios');
const Boom = require('@hapi/boom');
const get = require('lodash/get');

exports.sendMessage = async (to, body, credentials) => {
  const company = await Company.findOne({ _id: credentials.company._id }).lean();
  await exports.toto({ recipient: to, sender: company.tradeName, content: body });
};

exports.send = async ({ to, from, body }) => {
  await exports.toto({ recipient: to, sender: from, content: body });
};

exports.toto = async (data) => {
  try {
    await axios({
      method: 'POST',
      url: 'https://api.sendinblue.com/v3/transactionalSMS/sms',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': process.env.SENDINBLUE_API_KEY,
      },
      data: { type: 'transactional', ...data },
      json: true,
    });
  } catch (e) {
    throw Boom.badRequest(`SendinBlue - ${get(e, 'response.data.message')}`);
  }
};