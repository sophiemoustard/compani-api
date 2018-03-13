const _ = require('lodash');
const randomize = require('randomatic');

const tokenProcess = require('../helpers/tokenProcess');
const translate = require('../helpers/translate');

const language = translate.language;

const ActivationCode = require('../models/ActivationCode');

const createActivationCode = async (req, res) => {
  try {
    if (!req.body.mobile_phone || !req.body.sector || !req.body.managerId) {
      return res.status(400).json({ success: false, message: translate[language].missingParameters });
    }
    req.body.code = randomize('0000');
    const payload = _.pick(req.body, ['mobile_phone', 'code', 'sector', 'managerId', 'firstSMS']);
    const activationData = new ActivationCode(payload);
    await activationData.save();
    return res.status(200).json({ success: true, message: translate[language].activationCodeCreated, data: { activationData } });
  } catch (e) {
    console.error(e.message);
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

const checkActivationCode = async (req, res) => {
  try {
    if (!req.params.code) {
      return res.status(400).json({ success: false, message: translate[language].missingParameters });
    }
    const activationData = await ActivationCode.findOne({ code: req.params.code });
    if (!activationData) {
      return res.status(404).json({ success: false, message: translate[language].activationCodeNotFoundOrInvalid });
    }
    // 2 days expire
    const expireTime = 172800;
    const token = tokenProcess.encode({ activationData }, expireTime);
    return res.status(200).json({ success: true, message: translate[language].activationCodeValidated, data: { activationData, token } });
  } catch (e) {
    console.error(e.message);
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

const deleteActivationCode = async (req, res) => {
  try {
    const activationData = await ActivationCode.findOne({ mobile_phone: req.params.mobile_phone });
    if (!activationData) {
      return res.status(404).json({ success: false, message: translate[language].activationCodeNotFoundOrInvalid });
    }
    const deleteActivationData = await ActivationCode.findByIdAndRemove({ _id: activationData._id });
    return res.status(200).json({ success: true, message: translate[language].activationCodeDeleted, data: { deleteActivationData } });
  } catch (e) {
    console.error(e.message);
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

module.exports = {
  createActivationCode,
  checkActivationCode,
  deleteActivationCode
};
