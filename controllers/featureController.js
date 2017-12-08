const translate = require('../helpers/translate');
const dot = require('dot-object');

const language = translate.language;

const Feature = require('../models/Feature');

const create = async (req, res) => {
  try {
    if (!req.body.name) {
      return res.status(400).json({ success: false, message: translate[language].missingParameters });
    }
    const feature = new Feature(req.body);
    await feature.save();
    const payload = {
      _id: feature._id,
      name: feature.name,
    };
    return res.status(200).json({ success: true, message: translate[language].featureCreated, data: { feature: payload } });
  } catch (e) {
    console.error(e);
    if (e.code === 11000) {
      return res.status(409).json({ success: false, message: translate[language].featureExists });
    }
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

const update = async (req, res) => {
  if (!req.body) {
    return res.status(400).json({ success: false, message: translate[language].missingParameters });
  }
  try {
    const featureUpdated = await Feature.findOneAndUpdate({ _id: req.params._id }, { $set: dot.dot(req.body) }, { new: true });
    if (!featureUpdated) {
      return res.status(404).json({ success: false, message: translate[language].featureNotFound });
    }
    return res.status(200).json({ success: true, message: translate[language].featureUpdated, data: { feature: featureUpdated } });
  } catch (e) {
    console.error(e);
    // Error code when there is a duplicate key, in this case : the name (unique field)
    if (e.code === 11000) {
      return res.status(409).json({ success: false, message: translate[language].featureExists });
    }
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

// Show all features
const showAll = async (req, res) => {
  // No security here to restrict access
  try {
    const features = await Feature.find(req.query).select('_id name');
    if (features.length === 0) {
      return res.status(404).json({ success: false, message: translate[language].featuresShowAllNotFound });
    }
    return res.status(200).json({ success: true, message: translate[language].featuresShowAllFound, data: { features } });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

// Find an feature by Id
const show = async (req, res) => {
  try {
    const feature = await Feature.findOne({ _id: req.params._id });
    if (!feature) {
      return res.status(404).json({ success: false, message: translate[language].featureNotFound });
    }
    return res.status(200).json({ success: true, message: translate[language].featureFound, data: { feature } });
  } catch (e) {
    console.error(e);
    return res.status(404).json({ success: false, message: translate[language].featureNotFound });
  }
};

const remove = async (req, res) => {
  try {
    const featureDeleted = await Feature.findByIdAndRemove({ _id: req.params._id });
    if (!featureDeleted) {
      return res.status(404).json({ success: false, message: translate[language].featureNotFound });
    }
    return res.status(200).json({ success: true, message: translate[language].featureRemoved, data: { featureDeleted } });
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
