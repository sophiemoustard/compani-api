const Boom = require('boom');

const translate = require('../helpers/translate');
const User = require('../models/User');


const { language } = translate;

const list = async (req) => {
  try {
    const filter = {
      planningModification: { $exists: true }
    };
    if (req.query.userId) {
      filter._id = req.query.userId;
    }
    const modifPlanning = await User.find(filter, { firstname: 1, lastname: 1, sector: 1, 'planningModification._id': 1, 'planningModification.modificationType': 1, 'planningModification.involved': 1, 'planningModification.content': 1, 'planningModification.createdAt': 1, 'planningModification.check.isChecked': 1, 'planningModification.check.checkedAt': 1 }).populate({
      path: 'planningModification.check.checkBy',
      select: 'firstname lastname'
    }).lean();
    if (!modifPlanning) {
      return Boom.notFound(translate[language].planningModificationsNotFound);
    }
    return { message: translate[language].planningModificationsFound, data: { modifPlanning } };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

// const storeUserModificationPlanning = async (req, res) => {
//   try {
//     if (!req.body) {
//       return res.status(400).json({ success: false, message: translate[language].missingParameters });
//     }
//     const filter = {};
//     if (req.query.userId) {
//       filter._id = req.query.userId;
//     } else {
//       filter.employee_id = req.query.employeeId;
//     }
//     const payload = {
//       content: req.body.content,
//       involved: req.body.involved,
//       modificationType: req.body.type
//     };
//     if (req.body.check) {
//       payload.check = req.body.check;
//     }
//     const userModificationPlanningStored = await User.findOneAndUpdate(filter, { $push: { planningModification: payload } }, { new: true });
//     if (!userModificationPlanningStored) {
//       return res.status(404).json({ success: false, message: translate[language].userNotFound });
//     }
//     return res.status(200).json({ success: true, message: translate[language].planningModificationStored, data: { userModificationPlanningStored } });
//   } catch (e) {
//     console.error(e.message);
//     return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
//   }
// };

// const updateModificationPlanningStatusById = async (req, res) => {
//   try {
//     if (!req.params._id) {
//       return res.status(400).json({ success: false, message: translate[language].missingParameters });
//     }
//     const payload = {
//       isChecked: req.body.isChecked || false,
//       checkBy: req.body.checkBy || null,
//       checkedAt: req.body.checkedAt || null
//     };
//     const modificationPlanningUpdated = await User.findOneAndUpdate({ 'planningModification._id': req.params._id }, { $set: { 'planningModification.$.check': payload } }, { new: true });
//     if (!modificationPlanningUpdated) {
//       return res.status(404).json({ success: false, message: translate[language].planningModificationsNotFound });
//     }
//     return res.status(200).json({ success: true, message: translate[language].planningModificationUpdated, data: { modificationPlanningUpdated } });
//   } catch (e) {
//     console.error(e.message);
//     return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
//   }
// };

// const removeModificationPlanningById = async (req, res) => {
//   try {
//     if (!req.params._id || !req.query.userId) {
//       return res.status(400).json({ success: false, message: translate[language].missingParameters });
//     }
//     const modificationPlanning = await User.update({ _id: req.query.userId }, { $pull: { planningModification: { _id: req.params._id } } });
//     if (!modificationPlanning) {
//       return res.status(404).json({ success: false, message: translate[language].planningModificationsNotFound });
//     }
//     return res.status(200).json({ success: true, message: translate[language].planningModificationDeleted });
//   } catch (e) {
//     console.error(e.message);
//     return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
//   }
// };

module.exports = {
  list,
  // storeUserModificationPlanning,
  // updateModificationPlanningStatusById,
  // removeModificationPlanningById
};
