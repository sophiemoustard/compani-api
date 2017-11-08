const translate = require('../helpers/translate');

const language = translate.language;
// const _ = require('lodash');

const User = require('../models/User');

const getModificationPlanning = async (req, res) => {
  try {
    const filter = {
      planningModification: { $exists: true }
    };
    if (req.query.userId) {
      filter._id = req.query.userId;
    }
    const modifPlanning = await User.find(filter, { firstname: 1, lastname: 1, planningModification: 1 });
    if (!modifPlanning) {
      return res.status(404).json({ success: false, message: translate[language].planningModificationsNotFound });
    }
    return res.status(200).json({ success: true, message: translate[language].planningModificationsFound, data: { modifPlanning } });
  } catch (e) {
    console.error(e.message);
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

const storeUserModificationPlanning = async (req, res) => {
  try {
    if (!req.query.userId || !req.body.content || !req.body.involved || !req.body.type) {
      return res.status(400).json({ success: false, message: translate[language].missingParameters });
    }
    const payload = {
      content: req.body.content,
      involved: req.body.involved,
      modificationType: req.body.type
    };
    const userModificationPlanningStored = await User.findOneAndUpdate({ _id: req.query.userId }, { $push: { planningModification: payload } }, { new: true });
    if (!userModificationPlanningStored) {
      return res.status(404).json({ success: false, message: translate[language].userNotFound });
    }
    return res.status(200).json({ success: true, message: translate[language].planningModificationStored, data: { userModificationPlanningStored } });
  } catch (e) {
    console.error(e.message);
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

module.exports = {
  getModificationPlanning,
  storeUserModificationPlanning
};
