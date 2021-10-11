const DeliveryHelper = require('../helpers/delivery');

const generateDeliveryXml = async (req, h) => {
  try {
    const xml = await DeliveryHelper.generateDeliveryXml(req.query, req.auth.credentials);

    return h.file(xml, { confine: false });
  } catch (e) {
    req.log('error', e);
    return e;
  }
};

module.exports = { generateDeliveryXml };
