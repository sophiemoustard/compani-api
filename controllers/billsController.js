const Boom = require('boom');
const { ObjectID } = require('mongodb');
const moment = require('moment');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const util = require('util');
const handlebars = require('handlebars');
const ReadFile = util.promisify(fs.readFile);

const BillNumber = require('../models/BillNumber');
const Bill = require('../models/Bill');
const translate = require('../helpers/translate');
const { INTERVENTION, INVOICED_AND_NOT_PAYED, INVOICED_AND_PAYED, HOURLY } = require('../helpers/constants');
const { getDraftBillsList } = require('../helpers/draftBills');
const { formatAndCreateBills } = require('../helpers/bills');
const { getDateQuery } = require('../helpers/utils');

const { language } = translate;

const draftBillsList = async (req) => {
  try {
    const rules = [
      { endDate: { $lt: req.query.endDate } },
      { $or: [{ isBilled: false }, { isBilled: { $exists: false } }] },
      { $or: [
        { isCancelled: false },
        { isCancelled: { $exists: false } },
        { 'cancel.condition': INVOICED_AND_PAYED },
        { 'cancel.condition': INVOICED_AND_NOT_PAYED }]
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
    return Boom.badImplementation();
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
    return Boom.badImplementation();
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
    return Boom.badImplementation();
  }
};

const generatePdfs = async (req, h) => {
  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    const data = {
      invoice: {
        id: 2452,
        createdAt: '2018-10-12',
        customer: { name: 'International Bank of Blueprintya'},
        shipping: 10,
        total: 104.95,
        comments: 'Do not feed him fish',
        lines: [
          { id: 1, item: 'Best dry cleaner', price: '52.43' },
          { id: 2, item: 'Not so good toaster', price: '11.62' },
        ],
      },
    };

    const templatePath = path.resolve('./', './data/DocumentSigned.html')
    const content = await ReadFile(templatePath, 'utf8');
    handlebars.registerHelper('table', function (items, options) {
      let out = "";
      for (let i=0, l=items.length; i<l; i++) {
        out = out + options.fn(items[i]);
      }

      return out;
    });
    const template = handlebars.compile(content);
    const html = template(data);
    page.setContent(html);
    const pdf = await page.pdf({ format: 'A4', printBackground: true });

    return h.response(pdf).type('application/pdf');
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

module.exports = {
  draftBillsList,
  createBills,
  list,
  generatePdfs,
};
