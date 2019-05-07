const Boom = require('boom');

const Surcharge = require('../models/Surcharge');
const translate = require('../helpers/translate');

const { language } = translate;

const list = async (req) => {
  try {
    const surcharges = await Surcharge.find(req.query);

    return {
      message: surcharges.length === 0 ? translate[language].surchargesNotFound : translate[language].surchargesFound,
      data: { surcharges },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

const create = async (req) => {
  try {
    const surcharge = new Surcharge(req.payload);
    await surcharge.save();

    return {
      message: translate[language].surchargeCreated,
      data: { surcharge },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

const update = async (req) => {
  try {
    const updatedSurcharge = await Surcharge.findByIdAndUpdate(req.params._id, { $set: req.payload }, { new: true });

    if (!updatedSurcharge) return Boom.notFound(translate[language].surchargeNotFound);

    return {
      message: translate[language].surchargeUpdated,
      data: { surcharge: updatedSurcharge },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

const remove = async (req) => {
  try {
    const surcharge = await Surcharge.findByIdAndRemove(req.params._id);

    if (!surcharge) return Boom.notFound(translate[language].surchargeNotFound);

    return {
      message: translate[language].surchargeDeleted,
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

module.exports = {
  list,
  create,
  update,
  remove
};
