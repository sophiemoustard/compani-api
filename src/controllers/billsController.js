const Boom = require('@hapi/boom');
const get = require('lodash/get');
const BillHelper = require('../helpers/bills');

const generateBillPdf = async (req, h) => {
  try {
    req.log('billsController - generateBillPdf - params', req.params);
    req.log('billsController - generateBillPdf - company', get(req, 'auth.credentials.company._id'));

    const { pdf, billNumber } = await BillHelper.generateBillPdf(req.params, req.auth.credentials);

    return h.response(pdf)
      .header('content-disposition', `inline; filename=${billNumber}.pdf`)
      .type('application/pdf');
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { generateBillPdf };
