const translate = require('../helpers/translate');
const dot = require('dot-object');

const language = translate.language;

const Role = require('../models/Role');

const create = async (req, res) => {
  try {
    if (!req.body.role && !req.body.features) {
      return res.status(400).json({ success: false, message: translate[language].missingParameters });
    }
    const role = new Role(req.body);
    await role.save();
    const payload = {
      _id: role._id,
      name: role.name,
      features: role.features
    };
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
    const roles = await Role.find(req.query);
    if (roles.length === 0) {
      return res.status(404).json({ success: false, message: translate[language].rolesShowAllNotFound });
    }
    return res.status(200).json({ success: true, message: translate[language].rolesShowAllFound, data: { roles } });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

// Find an role by Id
const show = async (req, res) => {
  try {
    const role = await Role.findOne({ _id: req.params._id });
    if (!role) {
      return res.status(404).json({ success: false, message: translate[language].roleNotFound });
    }
    return res.status(200).json({ success: true, message: translate[language].roleFound, data: { role } });
  } catch (e) {
    console.error(e);
    return res.status(404).json({ success: false, message: translate[language].roleNotFound });
  }
};

module.exports = {
  create,
  update,
  showAll,
  show
};
