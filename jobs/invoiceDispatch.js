const Bill = require('../models/Bill');
const BillRepository = require('../repositories/BillRepository');
const { invoiceAlertEmail, completeIvoiceScriptEmail } = require('../helpers/email');

const BATCH_SIZE = 2;

const invoiceDispatch = {
  async method(server) {
    const errors = [];
    const results = [];
    let helpersChunk = [];
    // const customers = await BillRepository.findHelpersFromCustomerBill();
    const customers = [{ bills: [{ _id: '1234567890', sent: false }], helpers: [{ email: '3456789' }] }, { bills: [{ _id: '12345890', sent: false }], helpers: [{ email: '76543' }] }, { bills: [{ _id: '0987654321', sent: false }], helpers: [{ email: 'jeanchristophe@alenvi.io' }] }, { bills: [{ _id: '1234567890', sent: false }], helpers: [{ email: 'jctrebalag@gmail.com' }] }];
    if (customers.length) {
      const helpersEmails = customers.reduce((acc, customer) => [...acc, ...customer.helpers], []).map(helper => helper.email).filter(Boolean);

      for (let i = 0, l = helpersEmails.length; i < l; i += BATCH_SIZE) {
        helpersChunk = helpersEmails.slice(i, i + BATCH_SIZE);
        const requests = helpersChunk.map((email) => {
          try {
            return invoiceAlertEmail(email);
          } catch (e) {
            server.log(['error', 'cron', 'jobs'], e);
            errors.push(email);
          }
        });
        try {
          const emailsSent = await Promise.all(requests);
          results.push(...emailsSent);
        } catch (e) {
          server.log(['error', 'cron', 'jobs'], e);
          errors.push(...helpersChunk);
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
