const Company = require('../../../src/models/Company');
const CompanyHolding = require('../../../src/models/CompanyHolding');
const Customer = require('../../../src/models/Customer');
const Helper = require('../../../src/models/Helper');
const Holding = require('../../../src/models/Holding');
const Role = require('../../../src/models/Role');
const SectorHistory = require('../../../src/models/SectorHistory');
const Sector = require('../../../src/models/Sector');
const UserCompany = require('../../../src/models/UserCompany');
const User = require('../../../src/models/User');
const UserHolding = require('../../../src/models/UserHolding');
const { sector, sectorHistories } = require('../../seed/authSectorsSeed');
const {
  authCompany,
  otherCompany,
  companyWithoutSubscription,
  authHolding,
  otherHolding,
  companyHoldingList,
} = require('../../seed/authCompaniesSeed');
const { rolesList } = require('../../seed/authRolesSeed');
const { userList, userCompaniesList, userHoldingList } = require('../../seed/authUsersSeed');
const { authCustomer, helperCustomer } = require('../../seed/authCustomers');
const { deleteNonAuthenticationSeeds } = require('./db');

before(async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([
    Company.create([authCompany, otherCompany, companyWithoutSubscription]),
    CompanyHolding.create(companyHoldingList),
    Customer.create(authCustomer),
    Helper.create(helperCustomer),
    Holding.create([authHolding, otherHolding]),
    Sector.create(sector),
    SectorHistory.create(sectorHistories),
    Role.create(rolesList),
    User.create(userList),
    UserCompany.create(userCompaniesList),
    UserHolding.create(userHoldingList),
  ]);
});
