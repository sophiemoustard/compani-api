const { populateAuthentication } = require('../../tests/end2end/seed/authenticationSeed');
const { populateBilling } = require('../../tests/end2end/seed/billingSeed');
const { populatePlanning } = require('../../tests/end2end/seed/planningSeed');
const { PLANNING, AUTHENTICATION, BILLING } = require('./constants');

exports.seedDb = async (type) => {
  switch (type) {
    case PLANNING:
      await populatePlanning();
      break;
    case BILLING:
      await populateBilling();
      break;
    case AUTHENTICATION:
      await populateAuthentication();
      break;
  }
};
