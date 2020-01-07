const Boom = require('boom');
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

const generateBillSlipPdf = async (req, h) => {
  try {
    const { pdf, billSlipNumber } = await BillSlipsHelper.generatePdf(req.params._id, req.auth.credentials.company);

    return h.response(pdf)
      .header('content-disposition', `inline; filename=${billSlipNumber}.pdf`)
      .type('application/pdf');
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation();
  }
};

module.exports = {
  list,
  generateBillSlipPdf,
};
