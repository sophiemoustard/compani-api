const Company = require('../../../src/models/Company');
const Customer = require('../../../src/models/Customer');
const Helper = require('../../../src/models/Helper');
const Role = require('../../../src/models/Role');
const SectorHistory = require('../../../src/models/SectorHistory');
const Sector = require('../../../src/models/Sector');
const UserCompany = require('../../../src/models/UserCompany');
const User = require('../../../src/models/User');
const { sector, sectorHistories } = require('../../seed/authSectorsSeed');
const { authCompany, otherCompany, companyWithoutSubscription } = require('../../seed/authCompaniesSeed');
const { rolesList } = require('../../seed/authRolesSeed');
const { userList, userCompaniesList } = require('../../seed/authUsersSeed');
const { authCustomer, helperCustomer } = require('../../seed/authCustomers');
const { deleteNonAuthenticationSeeds } = require('./db');

before(async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([
    Company.create([authCompany, otherCompany, companyWithoutSubscription]),
    Customer.create(authCustomer),
    Helper.create(helperCustomer),
    Sector.create(sector),
    SectorHistory.create(sectorHistories),
    Role.create(rolesList),
    User.create(userList),
    UserCompany.create(userCompaniesList),
  ]);
});
