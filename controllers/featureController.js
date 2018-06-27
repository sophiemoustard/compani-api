const Boom = require('boom');
const flat = require('flat');

const translate = require('../helpers/translate');
const Feature = require('../models/Feature');
const Role = require('../models/Role');

const { language } = translate;

const create = async (req) => {
  try {
    const feature = new Feature(req.payload);
    await feature.save();
    const payload = {
      _id: feature._id,
      name: feature.name,
    };
    await Role.updateMany({ name: { $not: /^Admin$/ } }, { $push: { features: { feature_id: payload._id, permission_level: 0 } } });
    await Role.update({ name: 'Admin' }, { $push: { features: { feature_id: payload._id, permission_level: 2 } } });
    return { message: translate[language].featureCreated, data: { feature: payload } };
  } catch (e) {
    if (e.code === 11000) {
      req.log(['error', 'db'], e);
      return Boom.conflict(translate[language].featureExists);
    }
    req.log('error', e);
    return Boom.badImplementation(translate[language].unexpectedBehavior);
  }
};


const update = async (req) => {
  try {
    const featureUpdated = await Feature.findOneAndUpdate({ _id: req.params._id }, { $set: flat(req.payload) }, { new: true });
    if (!featureUpdated) {
      return Boom.notFound(translate[language].featureNotFound);
    }
    return { message: translate[language].featureUpdated, data: { feature: featureUpdated } };
  } catch (e) {
    // Error code when there is a duplicate key, in this case : the name (unique field)
    if (e.code === 11000) {
      req.log(['error', 'db'], e);
      return Boom.conflict(translate[language].featureExists);
    }
    req.log('error', e);
    return Boom.badImplementation(translate[language].unexpectedBehavior);
  }
};

module.exports = { create, update };
