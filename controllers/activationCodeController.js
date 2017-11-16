const _ = require('lodash');
const randomize = require('randomatic');

const tokenProcess = require('../helpers/tokenProcess');
const translate = require('../helpers/translate');

const language = translate.language;
// const _ = require('lodash');

const ActivationCode = require('../models/ActivationCode');

const createActivationCode = async (req, res) => {
  try {
    if (!req.body.employee_id) {
      return res.status(400).json({ success: false, message: translate[language].missingParameters });
    }
    const expireTime = 600;
    req.body.token = tokenProcess.encode({ employee_id: req.body.employee_id }, expireTime);
    req.body.code = randomize('000000');
    const payload = _.pick(req.body, ['employee_id', 'token', 'code']);
    const activationCode = new ActivationCode(payload);
    await activationCode.save();
    return res.status(200).json({ success: true, message: translate[language].activationCodeCreated, data: { activationCode } });
  } catch (e) {
    console.error(e.message);
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

const activationCodeAuthentication = async (req, res) => {
  try {
    if (!req.body.code) {
      return res.status(400).json({ success: false, message: translate[language].missingParameters });
    }
    const activationCode = await ActivationCode.findOne({ code: req.body.code });
    if (!activationCode) {
      return res.status(404).json({ success: false, message: translate[language].activationCodeNotFoundOrInvalid });
    }
    return res.status(200).json({ success: true, message: translate[language].activationCodeValidated, data: { activationCode } });
  } catch (e) {
    console.error(e.message);
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

module.exports = {
  createActivationCode,
  activationCodeAuthentication
};
