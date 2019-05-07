const Boom = require('boom');
const { ObjectID } = require('mongodb');
const moment = require('moment');

const BillNumber = require('../models/BillNumber');
const Bill = require('../models/Bill');
const Company = require('../models/Company');
const translate = require('../helpers/translate');
const { formatPrice } = require('../helpers/utils');
const { INTERVENTION, INVOICED_AND_NOT_PAYED, INVOICED_AND_PAYED } = require('../helpers/constants');
const { getDraftBillsList } = require('../helpers/draftBills');
const { formatAndCreateBills } = require('../helpers/bills');
const { getDateQuery } = require('../helpers/utils');
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
    const logo = 'https://res.cloudinary.com/alenvi/image/upload/v1507019444/images/business/alenvi_logo_complet_183x50.png';
    const bill = await Bill.findOne({ _id: req.params._id })
      .populate({ path: 'client', select: '_id name' })
      .populate({ path: 'customer', select: '_id identity contact' })
      .populate({ path: 'subscriptions.events', populate: { path: 'auxiliary', select: 'identity' } })
      .lean();
    const company = await Company.findOne();
    const computedData = {
      totalExclTaxes: 0,
      totalVAT: 0,
      totalInclTaxes: 0,
      date: moment(bill.date).format('DD/MM/YYYY'),
      formattedSubs: [],
      formattedEvents: []
    };
    for (let i = 0, l = bill.subscriptions.length; i < l; i++) {
      computedData.formattedSubs.push(bill.subscriptions[i]);
      computedData.totalExclTaxes += computedData.formattedSubs[i].exclTaxes;
      computedData.totalVAT = computedData.formattedSubs[i].inclTaxes - computedData.formattedSubs[i].exclTaxes;
      computedData.formattedSubs[i].exclTaxes = formatPrice(computedData.formattedSubs[i].exclTaxes);
      computedData.formattedSubs[i].inclTaxes = formatPrice(computedData.formattedSubs[i].inclTaxes);
      for (let j = 0, k = computedData.formattedSubs[i].events.length; j < k; j++) {
        const newEvent = bill.subscriptions[i].events[j];
        newEvent.auxiliary.identity.firstname = newEvent.auxiliary.identity.firstname.substring(0, 1);
        newEvent.date = moment(newEvent.startDate).format('DD/MM');
        newEvent.startTime = moment(newEvent.startDate).format('HH:mm');
        newEvent.endTime = moment(newEvent.endDate).format('HH:mm');
        newEvent.service = bill.subscriptions[i].service;
        computedData.formattedEvents.push(newEvent);
      }
    }
    computedData.totalExclTaxes = formatPrice(computedData.totalExclTaxes);
    computedData.totalVAT = formatPrice(computedData.totalVAT);
    const data = {
      bill: {
        ...bill,
        ...computedData,
        company,
        logo,
      },
    };

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
