const { ObjectId } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const { authCompany, otherCompany } = require('../../seed/authCompaniesSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');
const TaxCertificate = require('../../../src/models/TaxCertificate');
const Customer = require('../../../src/models/Customer');
const User = require('../../../src/models/User');
const Payment = require('../../../src/models/Payment');
const Helper = require('../../../src/models/Helper');
const { WEBAPP } = require('../../../src/helpers/constants');
const UserCompany = require('../../../src/models/UserCompany');
const { helperRoleId } = require('../../seed/authRolesSeed');

const customersList = [
  {
    _id: new ObjectId(),
    company: authCompany._id,
    identity: { lastname: 'Picsou', title: 'mr' },
    contact: {
      primaryAddress: {
        fullAddress: '37 rue de ponthieu 75008 Paris',
        zipCode: '75008',
        city: 'Paris',
        street: '37 rue de Ponthieu',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
    },
  }, {
    _id: new ObjectId(),
    company: otherCompany._id,
    identity: { lastname: 'Donald', title: 'mr' },
    contact: {
      primaryAddress: {
        fullAddress: '37 rue de ponthieu 75008 Paris',
        zipCode: '75008',
        city: 'Paris',
        street: '37 rue de Ponthieu',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
    },
  },
];

const helper = {
  _id: new ObjectId(),
  identity: { firstname: 'HelperForCustomer', lastname: 'Test' },
  local: { email: 'helper_for_customer_taxcertificates@alenvi.io', password: '123456!eR' },
  refreshToken: uuidv4(),
  role: { client: helperRoleId },
  origin: WEBAPP,
};

const userCompaniesList = [
  // old inactive user company
  {
    _id: new ObjectId(),
    user: helper._id,
    company: otherCompany._id,
    startDate: '2022-01-01T23:00:00.000Z',
    endDate: '2022-11-30T23:00:00.000Z',
  },
  { _id: new ObjectId(), company: authCompany._id, user: helper._id },
];
const taxCertificatesList = [
  { _id: new ObjectId(), company: authCompany._id, customer: customersList[0]._id, year: '2019' },
  { _id: new ObjectId(), company: authCompany._id, customer: customersList[0]._id, year: '2020' },
  { _id: new ObjectId(), company: otherCompany._id, customer: customersList[1]._id, year: '2019' },
];

const paymentList = [
  {
    _id: new ObjectId(),
    type: 'cesu',
    nature: 'payment',
    number: 'REG-101031900203',
    date: '2019-05-27T12:10:20',
    netInclTaxes: 1200,
    customer: customersList[0]._id,
    company: authCompany._id,
  },
  {
    _id: new ObjectId(),
    type: 'bank_transfer',
    nature: 'refund',
    number: 'REMB-101031900201',
    date: '2019-05-27T12:10:20',
    netInclTaxes: 70,
    customer: customersList[0]._id,
    company: authCompany._id,
  },
  {
    _id: new ObjectId(),
    type: 'direct_debit',
    number: 'REG-101031900201',
    nature: 'payment',
    date: '2019-05-27T12:10:20',
    netInclTaxes: 490,
    customer: customersList[0]._id,
    company: authCompany._id,
  },
  {
    _id: new ObjectId(),
    type: 'direct_debit',
    number: 'REG-101031900202',
    nature: 'payment',
    date: '2019-05-27T12:10:20',
    netInclTaxes: 600,
    customer: customersList[0]._id,
    company: authCompany._id,
  },
];

const helpersList = [{ customer: customersList[0]._id, user: helper._id, company: authCompany._id, referent: true }];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([
    Customer.create(customersList),
    TaxCertificate.create(taxCertificatesList),
    User.create(helper),
    Payment.create(paymentList),
    Helper.create(helpersList),
    UserCompany.create(userCompaniesList),
  ]);
};

module.exports = {
  populateDB,
  customersList,
  taxCertificatesList,
  helper,
};
