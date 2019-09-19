const mongoose = require('mongoose');
const Bill = require('../models/Bill');
const BillRepository = require('../repositories/BillRepository');
const EmailHelper = require('../helpers/email');

const BATCH_SIZE = 20;

const billDispatch = {
  async method(server) {
    const errors = [];
    const results = [];
    const customers = await BillRepository.findHelpersFromCustomerBill();
    if (customers.length) {
      for (let i = 0, l = customers.length; i < l; i += BATCH_SIZE) {
        const customersChunk = customers.slice(i, i + BATCH_SIZE);
        const data = {
          helpers: customersChunk.reduce((acc, cus) => [...acc, ...cus.helpers], []),
          billsIds: customersChunk.reduce((acc, cus) => [...acc, ...cus.bills], []).map(bill => bill._id),
        };

        const requests = data.helpers.map((helper) => {
          try {
            if (helper.local && helper.local.email) {
              return EmailHelper.billAlertEmail(helper.local.email);
            }
          } catch (e) {
            server.log(['error', 'cron', 'jobs'], e);
            errors.push(helper.local.email);
          }
        });

        try {
          const emailsSent = await Promise.all(requests);
          results.push(...emailsSent);
          await Bill.updateMany({ _id: { $in: data.billsIds } }, { $set: { sent: new Date() } });
        } catch (e) {
          if (!(e instanceof mongoose.Error)) {
            errors.push(...data.helpers.map(helper => helper.local && helper.local.email));
          }
          server.log(['error', 'cron', 'jobs'], e);
        }
      }
      this.onComplete(server, results, errors);
    }
  },
  async onComplete(server, results, errors) {
    try {
      server.log(['cron'], 'Invoice dispatch OK');
      if (errors && errors.length) {
        server.log(['error', 'cron', 'oncomplete'], errors);
      }
      server.log(['cron', 'oncomplete'], `Invoice dispatch: ${results.length} emails envoyés.`);
      await EmailHelper.completeBillScriptEmail(results.length, errors);
    } catch (e) {
      server.log(['error', 'cron', 'oncomplete'], e);
    }
  },
};

module.exports = billDispatch;
