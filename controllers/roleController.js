const _ = require('lodash');

const translate = require('../helpers/translate');
const dot = require('dot-object');

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
      if (_.has(req.body.features, features[i].name)) {
        createPayload.features.push({
          feature_id: features[i]._id,
          permission_level: req.body.features[features[i].name]
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
    const populatedRole = await Role.findOne({ _id: role._id }).populate('features.feature_id');
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
  if (!req.body) {
    return res.status(400).json({ success: false, message: translate[language].missingParameters });
  }
  try {
    const roleUpdated = await Role.findOneAndUpdate({ _id: req.params._id }, { $set: dot.dot(req.body) }, { new: true });
    if (!roleUpdated) {
      return res.status(404).json({ success: false, message: translate[language].roleNotFound });
    }
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
    const rolesRaw = await Role.find(req.query, { 'features._id': 0, updatedAt: 0, createdAt: 0, __v: 0 }).populate({ path: 'features.feature_id', select: 'name _id' });
    if (rolesRaw.length === 0) {
      return res.status(404).json({ success: false, message: translate[language].rolesShowAllNotFound });
    }
    const roles = [];
    rolesRaw.forEach((role) => {
      const features = [];
      role.features.forEach((feature) => {
        features.push({
          _id: feature.feature_id._id,
          name: feature.feature_id.name,
          permission_level: feature.permission_level
        });
      });
      roles.push({
        _id: role._id,
        name: role.name,
        features
      });
    });
    return res.status(200).json({ success: true, message: translate[language].rolesShowAllFound, data: { roles } });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

// Find an role by Id
const show = async (req, res) => {
  try {
    const roleRaw = await Role.findOne({ _id: req.params._id }, { 'features._id': 0, updatedAt: 0, createdAt: 0, __v: 0 }).populate({ path: 'features.feature_id', select: 'name _id' });
    if (!roleRaw) {
      return res.status(404).json({ success: false, message: translate[language].roleNotFound });
    }
    const role = {
      _id: roleRaw._id,
      name: roleRaw.name,
      features: []
    };
    roleRaw.features.forEach((feature) => {
      role.features.push({
        _id: feature.feature_id._id,
        name: feature.feature_id.name,
        permission_level: feature.permission_level
      });
    });
    return res.status(200).json({ success: true, message: translate[language].roleFound, data: { role } });
  } catch (e) {
    console.error(e);
    return res.status(404).json({ success: false, message: translate[language].roleNotFound });
  }
};

const remove = async (req, res) => {
  try {
    const roleDeleted = await Role.findByIdAndRemove({ _id: req.params._id });
    if (!roleDeleted) {
      return res.status(404).json({ success: false, message: translate[language].roleNotFound });
    }
    return res.status(200).json({ success: true, message: translate[language].roleRemoved, data: { roleDeleted } });
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
