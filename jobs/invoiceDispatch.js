const mongoose = require('mongoose');
const Bill = require('../models/Bill');
const BillRepository = require('../repositories/BillRepository');
const { invoiceAlertEmail, completeIvoiceScriptEmail } = require('../helpers/email');

const BATCH_SIZE = 2;

const invoiceDispatch = {
  async method(server) {
    const errors = [];
    const results = [];
    const helpersChunk = [];
    const customers = await BillRepository.findHelpersFromCustomerBill();
    if (customers.length) {
      for (let i = 0, l = customers.length; i < l; i += BATCH_SIZE) {
        const customersChunk = customers.slice(i, i + BATCH_SIZE);
        const billsIds = customersChunk.reduce((acc, cus) => [...acc, ...cus.bills], []);
        const requests = customersChunk.map((customer) => {
          for (const helper of customer.helpers) {
            try {
              if (helper.email) {
                return invoiceAlertEmail(helper.email);
              }
            } catch (e) {
              server.log(['error', 'cron', 'jobs'], e);
              errors.push(helper.email);
            }
          }
        });
        try {
          const emailsSent = await Promise.all(requests);
          results.push(...emailsSent);
          await Bill.updateMany({ _id: { $in: billsIds } }, { $set: { sent: new Date() } });
        } catch (e) {
          if (!(e instanceof mongoose.Error)) {
            errors.push(...helpersChunk.map(helper => helper.email));
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
      await completeIvoiceScriptEmail(results.length, errors);
    } catch (e) {
      server.log(['error', 'cron', 'oncomplete'], e);
    }
  },
};

module.exports = { invoiceDispatch };
