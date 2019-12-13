const Boom = require('boom');
const get = require('lodash/get');
const Bill = require('../models/Bill');
const Company = require('../models/Company');
const translate = require('../helpers/translate');
const { getDraftBillsList } = require('../helpers/draftBills');
const BillHelper = require('../helpers/bills');
const { generatePdf } = require('../helpers/pdf');
const { COMPANI } = require('../helpers/constants');

const { language } = translate;

const draftBillsList = async (req) => {
  try {
    const { startDate, endDate, billingStartDate, customer } = req.query;
    const dates = { endDate };
    if (startDate) dates.startDate = startDate;
    const { credentials } = req.auth;
    const draftBills = await getDraftBillsList(dates, billingStartDate, credentials, customer);

    return {
      message: translate[language].draftBills,
      data: { draftBills },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const createBills = async (req) => {
  try {
    await BillHelper.formatAndCreateBills(req.payload.bills, req.auth.credentials);

    return { message: translate[language].billsCreated };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const generateBillPdf = async (req, h) => {
  try {
    const bill = await Bill.findOne({ _id: req.params._id, origin: COMPANI })
      .populate({ path: 'client', select: '_id name address', match: { company: get(req, 'auth.credentials.company._id', null) } })
      .populate({ path: 'customer', select: '_id identity contact fundings' })
      .populate({ path: 'subscriptions.events.auxiliary', select: 'identity' })
      .lean();
    if (!bill) throw Boom.notFound('Bill not found');
    if (bill.origin !== COMPANI) return Boom.badRequest(translate[language].billNotCompani);

    const company = await Company.findOne();
    const data = BillHelper.formatPDF(bill, company);
    const pdf = await generatePdf(data, './src/data/bill.html');

    return h.response(pdf)
      .header('content-disposition', `inline; filename=${bill.number}.pdf`)
      .type('application/pdf');
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = {
  draftBillsList,
  createBills,
  generateBillPdf,
};
