const BillRepository = require('../repositories/BillRepository');
const { invoiceAlert } = require('../helpers/email');

const BATCH_SIZE = 2;

const invoiceDispatch = {
  async method(server) {
    const results = [];
    const errors = [];
    let helpersChunk = [];
    try {
      const customers = await BillRepository.findHelpersFromCustomerBill();
      // const customers = [{ helpers: [{ email: 'jeanchristophe@alenvi.io' }] }, { helpers: [{ email: 'jctrebalag@gmail.com' }] }, { helpers: [{ email: '3456789' }] }, { helpers: [{ email: '76543' }] }];
      if (customers.length) {
        const helpersEmails = customers.reduce((acc, customer) => [...acc, ...customer.helpers], []).map(helper => helper.email).filter(Boolean);

        for (let i = 0, l = helpersEmails.length; i < l; i += BATCH_SIZE) {
          helpersChunk = helpersEmails.slice(i, i + BATCH_SIZE);
          const requests = helpersChunk.map((email) => {
            try {
              return invoiceAlert(email);
            } catch (e) {
              server.log(['error', 'jobs'], e);
              errors.push(email);
            }
          });
          const resolvedPromises = await Promise.all(requests);
          results.push(...resolvedPromises);
        }
      }
      this.onComplete(results, errors);
    } catch (e) {
      server.log(['error', 'jobs'], e);
      errors.push(...helpersChunk);
      this.onComplete(results, errors);
    }
  },
  async onComplete(results, errors) {
    console.log('OK');
    if (results && results.length) {
      console.log('results', results);
    }
    console.log('errors', errors);
  },
};

module.exports = { invoiceDispatch };
