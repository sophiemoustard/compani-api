const mongoose = require('mongoose');
const get = require('lodash/get');
const Bill = require('../models/Bill');
const Company = require('../models/Company');
const BillRepository = require('../repositories/BillRepository');
const EmailHelper = require('../helpers/email');
const UtilsHelper = require('../helpers/utils');

const BATCH_SIZE = 20;

const billDispatch = {
  async method(server) {
    const date = get(server, 'query.date') || new Date();
    const errors = [];
    const results = [];

    const [billsAndHelpers, companies] = await Promise.all([
      BillRepository.findBillsAndHelpersByCustomer(date),
      Company.find().lean(),
    ]);
    if (billsAndHelpers.length) {
      for (let i = 0, l = billsAndHelpers.length; i < l; i += BATCH_SIZE) {
        const billsAndHelpersChunk = billsAndHelpers.slice(i, i + BATCH_SIZE);
        const helpers = billsAndHelpersChunk.reduce((acc, cus) => [...acc, ...cus.helpers], []);
        const billsIds = billsAndHelpersChunk.reduce((acc, cus) => [...acc, ...cus.bills], []).map(bill => bill._id);

        const requests = [];
        for (const helper of helpers) {
          try {
            const company = companies.find(comp => UtilsHelper.areObjectIdsEquals(comp._id, helper.company));
            requests.push(EmailHelper.billAlertEmail(helper.local.email, company));
          } catch (e) {
            server.log(['error', 'cron', 'jobs'], e);
            errors.push(helper.local.email);
          }
        }

        try {
          const emailsSent = await Promise.all(requests);
          results.push(...emailsSent);
          await Bill.updateMany({ _id: { $in: billsIds } }, { $set: { sentAt: new Date() } });
        } catch (e) {
          if (!(e instanceof mongoose.Error)) errors.push(...helpers.map(helper => helper.local.email));

          server.log(['error', 'cron', 'jobs'], e);
        }
      }
    }
    return { results, errors };
  },
  async onComplete(server, { results, errors }) {
    try {
      server.log(['cron'], 'Bill dispatch OK');
      if (errors && errors.length) server.log(['error', 'cron', 'oncomplete'], errors);

      server.log(['cron', 'oncomplete'], `Bill dispatch: ${results.length} emails envoyés.`);

      await EmailHelper.completeBillScriptEmail(results.length, errors);
    } catch (e) {
      server.log(['error', 'cron', 'oncomplete'], e);
    }
  },
};

module.exports = billDispatch;
