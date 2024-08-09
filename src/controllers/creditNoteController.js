const Boom = require('@hapi/boom');
const get = require('lodash/get');
const CreditNoteHelper = require('../helpers/creditNotes');

const generateCreditNotePdf = async (req, h) => {
  try {
    req.log('creditNoteController - generateCreditNotePdf - params', req.params);
    req.log('creditNoteController - generateCreditNotePdf - company', get(req, 'auth.credentials.company._id'));

    const { pdf, creditNoteNumber } = await CreditNoteHelper.generateCreditNotePdf(req.params, req.auth.credentials);

    return h.response(pdf)
      .header('content-disposition', `inline; filename=${creditNoteNumber}.pdf`)
      .type('application/pdf');
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = {
  generateCreditNotePdf,
};
