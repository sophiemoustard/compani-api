const Boom = require('@hapi/boom');
const BillSlipsHelper = require('../helpers/billSlips');
const translate = require('../helpers/translate');

const { language } = translate;

const list = async (req) => {
  try {
    const billSlips = await BillSlipsHelper.getBillSlips(req.auth.credentials);

    return {
      message: translate[language].billSlipsFound,
      data: { billSlips },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation();
  }
};

const generateBillSlipDocx = async (req, h) => {
  try {
    const { file, billSlipNumber } = await BillSlipsHelper.generateFile(req.params._id, req.auth.credentials);

    return h.file(file, { confine: false })
      .header('content-disposition', `inline; filename=${billSlipNumber}.docx`)
      .type('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation();
  }
};

module.exports = { list, generateBillSlipDocx };
