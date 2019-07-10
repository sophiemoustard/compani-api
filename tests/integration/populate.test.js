const { populateUsers } = require('./seed/usersSeed');
const { populateRoles } = require('./seed/rolesSeed');
const { populateCompanies } = require('./seed/companiesSeed');

before(populateRoles);
before(populateUsers);
before(populateCompanies);
