const { populateAuthentication } = require('../../tests/end2end/seed/authenticationSeed');
const { AUTHENTICATION } = require('./constants');

exports.seedDb = async (type) => {
  switch (type) {
    case AUTHENTICATION:
      await populateAuthentication();
      break;
  }
};
