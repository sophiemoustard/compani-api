const DeliveryHelper = require('../helpers/delivery');

const generateDeliveryXml = async (req, h) => {
  try {
    const xml = await DeliveryHelper.generateDeliveryXml(req.query, req.auth.credentials);

    return h.file(xml.file, { confine: false, filename: 'Test', mode: 'attachment' }).type('application/xml');
  } catch (e) {
    req.log('error', e);
    return e;
  }
};

module.exports = { generateDeliveryXml };
