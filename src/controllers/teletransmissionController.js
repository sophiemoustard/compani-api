const get = require('lodash/get');
const DeliveryHelper = require('../helpers/delivery');

const generateDeliveryXml = async (req, h) => {
  try {
    req.log('teletransmissionController - generateDeliveryXml - query', req.query);
    req.log('teletransmissionController - generateDeliveryXml - company', get(req, 'auth.credentials.company._id'));

    const xml = await DeliveryHelper.generateDeliveryXml(req.query, req.auth.credentials);

    return h.file(xml.file, { confine: false, filename: xml.fileName, mode: 'attachment' }).type('application/xml');
  } catch (e) {
    req.log('error', e);
    return e;
  }
};

module.exports = { generateDeliveryXml };
