const translate = require('../../helpers/translate');
const bankInfo = require('../../models/Ogust/BankInfo');
const _ = require('lodash');

const language = translate.language;

const getById = async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({ success: false, message: translate[language].missingParameters });
    }
    console.log(req.body);
    const params = {
      token: req.headers['x-ogust-token'],
      id_bankinfo: req.params.id,
    };
    const newParams = _.pickBy(params);
    const bankInfoRaw = await bankInfo.getBankInfoById(newParams);
    if (bankInfoRaw.body.status == 'KO') {
      return res.status(400).json({ success: false, message: bankInfoRaw.body.message });
    }
    return res.status(200).json({ success: true, message: translate[language].bankInfoUpdated, data: { bankInfo: bankInfoRaw.body } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

const updateByEmployeeId = async (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).json({ success: false, message: translate[language].missingParameters });
    }
    console.log(req.body);
    const params = {
      token: req.headers['x-ogust-token'],
      id_tiers: req.body.id_tiers,
      iban_number: req.body.iban_number || '',
      bic_number: req.body.bic_number || ''
    };
    const newParams = _.pickBy(params);
    const updatedBankInfo = await bankInfo.setBankInfoByEmployeeId(newParams);
    if (updatedBankInfo.body.status == 'KO') {
      return res.status(400).json({ success: false, message: updatedBankInfo.body.message });
    }
    return res.status(200).json({ success: true, message: translate[language].bankInfoUpdated, data: { updatedBankInfo: updatedBankInfo.body } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

module.exports = {
  updateByEmployeeId,
  getById
};
