const Boom = require('boom');
const _ = require('lodash');

const translate = require('../helpers/translate');
// const { populateRole } = require('../helpers/populateRole');

const { language } = translate;

const Role = require('../models/Role');
const Feature = require('../models/Feature');

const create = async (req) => {
  try {
    const createPayload = { name: req.payload.name, features: [] };
    const features = await Feature.find();
    if (features.length === 0) {
      return Boom.notFound({ success: false, message: translate[language].featuresDoNotExist });
    }
    for (let i = 0, l = features.length; i < l; i++) {
      const existingFeature = _.find(req.payload.features, ['_id', features[i]._id.toString()]);
      if (existingFeature && (isNaN(existingFeature.permission_level) || existingFeature.permission_level < 0 || existingFeature.permission_level > 2)) {
        return Boom.badRequest({ success: false, message: translate[language].invalidPermLevel, error: existingFeature });
      }
      if (existingFeature) {
        createPayload.features.push({
          feature_id: features[i]._id,
          permission_level: existingFeature.permission_level
        });
      } else {
        createPayload.features.push({
          feature_id: features[i]._id,
          permission_level: 0
        });
      }
    }
    const role = new Role(createPayload);
    await role.save();
    const populatedRole = await Role.findOne({ _id: role._id }).populate('features.feature_id').lean();
    const payload = {
      _id: populatedRole._id.toHexString(),
      name: populatedRole.name,
      features: []
    };
    for (let i = 0, l = populatedRole.features.length; i < l; i++) {
      payload.features.push({
        _id: populatedRole.features[i].feature_id._id,
        [populatedRole.features[i].feature_id.name]: populatedRole.features[i].permission_level
      });
    }
    return { success: true, message: translate[language].roleCreated, data: { role: payload } };
  } catch (e) {
    if (e.code === 11000) {
      return Boom.conflit(translate[language].roleExists);
    }
    return Boom.badImplementation(translate[language].unexpectedBehavior);
  }
};

module.exports = { create };
