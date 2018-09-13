const Boom = require('boom');

const translate = require('../../helpers/translate');
const address = require('../../models/Ogust/Address');

const { language } = translate;

const update = async (req) => {
  try {
    const params = req.payload;
    params.token = req.headers['x-ogust-token'];
    const user = await address.editAddress(params);
    if (user.data.status == 'KO') {
      return Boom.badRequest(user.data.message);
    }
    return {
      message: translate[language].addressUpdated,
      data: user.data
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

module.exports = {
  update
};
