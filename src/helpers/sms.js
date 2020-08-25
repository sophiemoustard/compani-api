const axios = require('axios');
const Boom = require('@hapi/boom');
const get = require('lodash/get');
const Company = require('../models/Company');

exports.sendFromCompany = async (data, credentials) => {
  const company = await Company.findOne({ _id: credentials.company._id }).lean();

  await exports.send({ ...data, sender: company.tradeName });
};

exports.send = async (data) => {
  try {
    await axios({
      method: 'POST',
      url: 'https://api.sendinblue.com/v3/transactionalSMS/sms',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': process.env.SENDINBLUE_API_KEY,
      },
      data: {
        type: 'transactional',
        ...data,
        tag: process.env.NODE_ENV !== 'production' ? `Test - ${data.tag}` : data.tag,
        content: process.env.NODE_ENV !== 'production'
          ? `Sms de Test - ${data.content.substring(0, 100)}`
          : data.content,
      },
      json: true,
    });
  } catch (e) {
    throw Boom.badRequest(`SendinBlue - ${get(e, 'response.data.message')}`);
  }
};
