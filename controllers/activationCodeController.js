const _ = require('lodash');
const randomize = require('randomatic');

const tokenProcess = require('../helpers/tokenProcess');
const translate = require('../helpers/translate');

const language = translate.language;

const ActivationCode = require('../models/ActivationCode');

const createActivationCode = async (req, res) => {
  try {
    if (!req.body.mobile_phone || !req.body.sector) {
      return res.status(400).json({ success: false, message: translate[language].missingParameters });
    }
    req.body.code = randomize('0000');
    // const payload = _.pick(req.body, ['employee_id', 'token', 'code']);
    const payload = _.pick(req.body, ['mobile_phone', 'code', 'sector']);
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
    const activationData = await ActivationCode.findOne({ code: req.body.code });
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

// const linkActivationCode = async (req, res) => {
//   try {
//     if (!req.body.code || !req.body.id_employee) {
      
//     }
//   } catch (e) {

//   }
// }

module.exports = {
  createActivationCode,
  checkActivationCode
};
