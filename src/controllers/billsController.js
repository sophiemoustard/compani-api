const Boom = require('@hapi/boom');
const translate = require('../helpers/translate');
const { getDraftBillsList } = require('../helpers/draftBills');
const BillHelper = require('../helpers/bills');

const { language } = translate;

const draftBillsList = async (req) => {
  try {
    const draftBills = await getDraftBillsList(req.query, req.auth.credentials);

    return { message: translate[language].draftBills, data: { draftBills } };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const createBillList = async (req) => {
  try {
    await BillHelper.formatAndCreateList(req.payload.bills, req.auth.credentials);

    return { message: translate[language].billsCreated };
  } catch (e) {
    req.log('error', e);
    if (e.code === 11000) return Boom.conflict();
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const list = async (req) => {
  try {
    const bills = await BillHelper.list(req.query, req.auth.credentials);

    return { message: translate[language].billsFound, data: { bills } };
  } catch (e) {
    req.log('error', e);
    if (e.code === 11000) return Boom.conflict();
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const createBill = async (req) => {
  try {
    await BillHelper.formatAndCreateBill(req.payload, req.auth.credentials);

    return { message: translate[language].billCreated };
  } catch (e) {
    req.log('error', e);
    if (e.code === 11000) return Boom.conflict();
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const generateBillPdf = async (req, h) => {
  try {
    const { pdf, billNumber } = await BillHelper.generateBillPdf(req.params, req.auth.credentials);

    return h.response(pdf)
      .header('content-disposition', `inline; filename=${billNumber}.pdf`)
      .type('application/pdf');
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { draftBillsList, createBillList, generateBillPdf, createBill, list };
