const Boom = require('boom');

const translate = require('../../helpers/translate');
const bankInfo = require('../../models/Ogust/BankInfo');

const { language } = translate;

const getById = async (req) => {
  try {
    const params = {
      token: req.headers['x-ogust-token'],
      id_bankinfo: req.params.id,
    };
    const bankInfoRaw = await bankInfo.getBankInfoById(params);
    if (bankInfoRaw.data.status == 'KO') {
      return Boom.badRequest(bankInfoRaw.data.message);
    }
    return {
      message: translate[language].bankInfoUpdated,
      data: { bankInfo: bankInfoRaw.data }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const updateById = async (req) => {
  try {
    const params = req.payload;
    params.token = req.headers['x-ogust-token'];
    const updatedBankInfo = await bankInfo.setBankInfoById(params);
    if (updatedBankInfo.data.status == 'KO') {
      return Boom.badRequest(updatedBankInfo.data.message);
    }
    return {
      message: translate[language].bankInfoUpdated,
      data: { updatedBankInfo: updatedBankInfo.data }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

module.exports = {
  updateById,
  getById
};
