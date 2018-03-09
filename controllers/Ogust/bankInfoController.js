const translate = require('../../helpers/translate');
const bankInfo = require('../../models/Ogust/BankInfo');
const _ = require('lodash');

const language = translate.language;


const updateByEmployeeId = async (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).json({ success: false, message: translate[language].missingParameters });
    }
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
  updateByEmployeeId
};
