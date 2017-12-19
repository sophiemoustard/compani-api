const _ = require('lodash');

const translate = require('../helpers/translate');
const { populateRole } = require('../helpers/populateRole');

const language = translate.language;

const Role = require('../models/Role');
const Feature = require('../models/Feature');

const create = async (req, res) => {
  try {
    if (!req.body.name && !req.body.features) {
      return res.status(400).json({ success: false, message: translate[language].missingParameters });
    }
    const createPayload = { name: req.body.name, features: [] };
    const features = await Feature.find();
    if (features.length === 0) {
      return res.status(404).json({ success: false, message: translate[language].featuresDoNotExist });
    }
    for (let i = 0, l = features.length; i < l; i++) {
      const existingFeature = _.find(req.body.features, ['_id', features[i]._id.toString()]);
      if (existingFeature && (isNaN(existingFeature.permission_level) || existingFeature.permission_level < 0 || existingFeature.permission_level > 2)) {
        return res.status(400).json({ success: false, message: translate[language].invalidPermLevel, error: existingFeature });
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
      _id: populatedRole._id,
      name: populatedRole.name,
      features: []
    };
    for (let i = 0, l = populatedRole.features.length; i < l; i++) {
      payload.features.push({
        _id: populatedRole.features[i].feature_id._id,
        [populatedRole.features[i].feature_id.name]: populatedRole.features[i].permission_level
      });
    }
    return res.status(200).json({ success: true, message: translate[language].roleCreated, data: { role: payload } });
  } catch (e) {
    console.error(e);
    if (e.code === 11000) {
      return res.status(409).json({ success: false, message: translate[language].roleExists });
    }
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};
const update = async (req, res) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ success: false, message: translate[language].missingParameters });
  }
  try {
    const payload = {};
    if (req.body.name) {
      payload.name = req.body.name;
    }
    if (req.body.features) {
      payload.features = [];
      req.body.features.forEach((feature) => {
        payload.features.push({
          feature_id: feature._id,
          permission_level: feature.permission_level
        });
      });
    }
    const roleUpdated = await Role.findOneAndUpdate({ _id: req.params._id }, { $set: payload }, { new: true, fields: { 'features._id': 0, updatedAt: 0, createdAt: 0, __v: 0 } }).populate({ path: 'features.feature_id', select: 'name _id' }).lean();
    if (!roleUpdated) {
      return res.status(404).json({ success: false, message: translate[language].roleNotFound });
    }
    roleUpdated.features = populateRole(roleUpdated.features);
    return res.status(200).json({ success: true, message: translate[language].roleUpdated, data: { role: roleUpdated } });
  } catch (e) {
    console.error(e);
    // Error code when there is a duplicate key, in this case : the name (unique field)
    if (e.code === 11000) {
      return res.status(409).json({ success: false, message: translate[language].roleExists });
    }
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

// Show all roles
const showAll = async (req, res) => {
  // No security here to restrict access
  try {
    const roles = await Role.find(req.query, { 'features._id': 0, updatedAt: 0, createdAt: 0, __v: 0 }).populate({ path: 'features.feature_id', select: 'name _id' }).lean();
    if (roles.length === 0) {
      return res.status(404).json({ success: false, message: translate[language].rolesShowAllNotFound });
    }
    roles.forEach((role) => {
      role.features = populateRole(role.features);
    });
    return res.status(200).json({ success: true, message: translate[language].rolesShowAllFound, data: { roles } });
  } catch (e) {
    console.error(e);
  }
};

// Find an role by Id
const show = async (req, res) => {
  try {
    const role = await Role.findOne({ _id: req.params._id }, { 'features._id': 0, updatedAt: 0, createdAt: 0, __v: 0 }).populate({ path: 'features.feature_id', select: 'name _id' }).lean();
    if (!role) {
      return res.status(404).json({ success: false, message: translate[language].roleNotFound });
    }
    role.features = populateRole(role.features);
    return res.status(200).json({ success: true, message: translate[language].roleFound, data: { role } });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

const remove = async (req, res) => {
  try {
    const roleDeleted = await Role.findByIdAndRemove({ _id: req.params._id });
    if (!roleDeleted) {
      return res.status(404).json({ success: false, message: translate[language].roleNotFound });
    }
    return res.status(200).json({ success: true, message: translate[language].roleRemoved, data: { role: roleDeleted } });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

module.exports = {
  create,
  update,
  showAll,
  show,
  remove
};
