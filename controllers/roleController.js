const Boom = require('boom');
const _ = require('lodash');

const translate = require('../helpers/translate');
const { populateRole } = require('../helpers/populateRole');

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
    req.log('error', e);
    if (e.code === 11000) {
      return Boom.conflict(translate[language].roleExists);
    }
    return Boom.badImplementation(translate[language].unexpectedBehavior);
  }
};

const update = async (req) => {
  try {
    const role = await Role.findById(req.params._id);
    if (!role) return Boom.notFound(translate[language].roleNotFound);
    // const leanRole = role.toObject();
    const payload = {};
    if (req.payload.name) {
      payload.name = req.payload.name;
    }
    if (req.payload.features) {
      let features = await Feature.find().lean();
      features = features.map(feature => ({ _id: feature._id.toString() }));
      payload.features = [];
      req.payload.features.forEach((feature) => {
        if (_.find(features, ['_id', feature._id])) {
          payload.features.push({
            feature_id: feature._id,
            permission_level: feature.permission_level
          });
        }
      });
    }
    for (let i = 0, l = payload.features.length; i < l; i++) {
      for (let k = 0, len = role.features.length; k < len; k++) {
        if (payload.features[i].feature_id === role.features[k].feature_id.toString()) {
          role.features[k].set({ permission_level: payload.features[i].permission_level });
          break;
        }
      }
    }
    role.name = payload.name;
    let roleUpdated = await role.save();
    roleUpdated = await roleUpdated.populate({
      path: 'features.feature_id',
      select: '_id name',
      model: Feature
    }).execPopulate();
    roleUpdated = roleUpdated.toObject();
    if (roleUpdated.features) {
      roleUpdated.features = populateRole(roleUpdated.features);
    }
    return { message: translate[language].roleUpdated, data: { role: roleUpdated } };
  } catch (e) {
    console.error(e);
    // Error code when there is a duplicate key, in this case : the name (unique field)
    if (e.code === 11000) {
      return Boom.conflict(translate[language].roleExists);
    }
    return Boom.badImplementation(translate[language].unexpectedBehavior);
  }
};

module.exports = { create, update };
