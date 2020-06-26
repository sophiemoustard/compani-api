const { populateAuthentication } = require('../../tests/end2end/seed/authenticationSeed');
const { populateBilling } = require('../../tests/end2end/seed/billingSeed');
const { populatePlanning } = require('../../tests/end2end/seed/planningSeed');
const { populateAgenda } = require('../../tests/end2end/seed/agendaSeed');
const { PLANNING, AUTHENTICATION, BILLING, AGENDA } = require('../helpers/constants');

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
    case AGENDA:
      await populateAgenda();
      break;
  }
};
