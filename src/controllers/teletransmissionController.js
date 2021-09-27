const DeliveryHelper = require('../helpers/delivery');
const translate = require('../helpers/translate');

const { language } = translate;

const generateDeliveryXml = async (req) => {
  try {
    const xml = await DeliveryHelper.generateDeliveryXml(req.query, req.auth.credentials);

    return { message: translate[language].delievryCreated, data: { xml } };
  } catch (e) {
    req.log('error', e);
    return e;
  }
};

module.exports = { generateDeliveryXml };
