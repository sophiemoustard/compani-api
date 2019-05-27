const Boom = require('boom');
const { ObjectID } = require('mongodb');
const moment = require('moment');
const BillNumber = require('../models/BillNumber');
const Bill = require('../models/Bill');
const Company = require('../models/Company');
const translate = require('../helpers/translate');
const { INTERVENTION, INVOICED_AND_NOT_PAYED, INVOICED_AND_PAYED } = require('../helpers/constants');
const { getDraftBillsList } = require('../helpers/draftBills');
const { formatAndCreateBills } = require('../helpers/bills');
const { getDateQuery } = require('../helpers/utils');
const { formatPDF } = require('../helpers/bills');
const { generatePdf } = require('../helpers/pdf');

const { language } = translate;

const draftBillsList = async (req) => {
  try {
    const rules = [
      { endDate: { $lt: req.query.endDate } },
      { $or: [{ isBilled: false }, { isBilled: { $exists: false } }] },
      {
        $or: [
          { isCancelled: false },
          { isCancelled: { $exists: false } },
          { 'cancel.condition': INVOICED_AND_PAYED },
          { 'cancel.condition': INVOICED_AND_NOT_PAYED }
        ]
      },
      { type: INTERVENTION },
    ];
    if (req.query.startDate) rules.push({ startDate: { $gte: req.query.startDate } });
    if (req.query.customer) rules.push({ customer: new ObjectID(req.query.customer) });

    const draftBills = await getDraftBillsList(rules, req.query);

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
    const prefix = `FACT-${moment().format('MMYY')}`;
    const number = await BillNumber.findOneAndUpdate(
      { prefix },
      {},
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    await formatAndCreateBills(number, req.payload.bills);

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

    const bills = await Bill.find(query).populate({ path: 'client', select: '_id name' });

    if (!bills) return Boom.notFound(translate[language].billsNotFound);

    return {
      message: translate[language].billsFound,
      data: { bills }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

const generateBillPdf = async (req, h) => {
  try {
    const bill = await Bill.findOne({ _id: req.params._id })
      .populate({ path: 'client', select: '_id name address' })
      .populate({ path: 'customer', select: '_id identity contact fundings' })
      .populate({ path: 'subscriptions.events', populate: { path: 'auxiliary', select: 'identity' } })
      .lean();
    const company = await Company.findOne();
    const data = formatPDF(bill, company);
    const pdf = await generatePdf(data, './data/bill.html');

    return h.response(pdf).type('application/pdf');
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

module.exports = {
  draftBillsList,
  createBills,
  list,
  generateBillPdf,
};
