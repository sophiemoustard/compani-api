const Boom = require('boom');
const moment = require('moment');
const BillNumber = require('../models/BillNumber');
const Bill = require('../models/Bill');
const Company = require('../models/Company');
const translate = require('../helpers/translate');
const { getDraftBillsList } = require('../helpers/draftBills');
const { formatAndCreateBills } = require('../helpers/bills');
const { getDateQuery } = require('../helpers/utils');
const { formatPDF } = require('../helpers/bills');
const { generatePdf } = require('../helpers/pdf');
const { COMPANI } = require('../helpers/constants');

const { language } = translate;

const draftBillsList = async (req) => {
  try {
    const { startDate, endDate, billingStartDate, customer } = req.query;
    const dates = { endDate };
    if (startDate) dates.startDate = startDate;
    const draftBills = await getDraftBillsList(dates, billingStartDate, customer);

    return {
      message: translate[language].draftBills,
      data: { draftBills },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

const createBills = async (req) => {
  try {
    const { bills } = req.payload;
    const prefix = `FACT-${moment(bills[0].endDate).format('MMYY')}`;
    const number = await BillNumber.findOneAndUpdate(
      { prefix },
      {},
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    await formatAndCreateBills(number, bills);

    return { message: translate[language].billsCreated };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

const list = async (req) => {
  try {
    const { startDate, endDate, ...rest } = req.query;
    const query = rest;
    if (startDate || endDate) query.date = getDateQuery({ startDate, endDate });

    const bills = await Bill.find(query).populate({
      path: 'client',
      select: '_id name',
      match: { company: req.auth.credentials.company._id },
    });

    if (!bills) return Boom.notFound(translate[language].billsNotFound);

    return {
      message: translate[language].billsFound,
      data: { bills },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

const generateBillPdf = async (req, h) => {
  try {
    const bill = await Bill.findOne({ _id: req.params._id, origin: COMPANI })
      .populate({ path: 'client', select: '_id name address', match: { company: req.auth.credentials.company._id } })
      .populate({ path: 'customer', select: '_id identity contact fundings' })
      .populate({ path: 'subscriptions.events.auxiliary', select: 'identity' })
      .lean();
    if (!bill) throw Boom.notFound('Bill not found');
    if (bill.origin !== COMPANI) return Boom.badRequest(translate[language].billNotCompani);

    const company = await Company.findOne();
    const data = formatPDF(bill, company);
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
  list,
  generateBillPdf,
};
