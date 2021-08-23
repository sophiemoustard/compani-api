const { ObjectID } = require('mongodb');
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');
const Payment = require('../../../src/models/Payment');
const Customer = require('../../../src/models/Customer');
const ThirdPartyPayer = require('../../../src/models/ThirdPartyPayer');
const PaymentNumber = require('../../../src/models/PaymentNumber');
const User = require('../../../src/models/User');
const { PAYMENT, REFUND, WEBAPP } = require('../../../src/helpers/constants');
const { rolesList, authCompany, otherCompany } = require('./authenticationSeed');
const { deleteNonAuthenticationSeeds } = require('./initializeDB');
const UserCompany = require('../../../src/models/UserCompany');
const Helper = require('../../../src/models/Helper');

const paymentTppList = [
  { _id: new ObjectID(), name: 'Toto', company: authCompany._id, isApa: true, billingMode: 'direct' },
  { _id: new ObjectID(), name: 'Tata', company: authCompany._id, isApa: true, billingMode: 'direct' },
];

const paymentCustomerList = [
  {
    _id: new ObjectID(),
    company: authCompany._id,
    identity: { title: 'mr', firstname: 'Egan', lastname: 'Bernal' },
    contact: {
      primaryAddress: {
        fullAddress: '37 rue de ponthieu 75008 Paris',
        zipCode: '75008',
        city: 'Paris',
        street: '37 rue de Ponthieu',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
      phone: '0612345678',
    },
    payment: {
      bankAccountOwner: 'Lance Amstrong',
      iban: 'FR3514508000505917721779B12',
      bic: 'BNMDHISOBD',
      mandates: [{ rum: 'R09876543456765432', _id: new ObjectID(), signedAt: moment().toDate() }],
    },
    subscriptions: [{
      _id: new ObjectID(),
      service: new ObjectID(),
      versions: [{
        unitTTCRate: 12,
        estimatedWeeklyVolume: 12,
        evenings: 2,
        sundays: 1,
        startDate: '2018-01-01T10:00:00.000+01:00',
      }],
    }],
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    identity: { title: 'mr', firstname: 'Romain', lastname: 'Bardet' },
    contact: {
      primaryAddress: {
        fullAddress: '37 rue de ponthieu 75008 Paris',
        zipCode: '75008',
        city: 'Paris',
        street: '37 rue de Ponthieu',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
      phone: '0612345678',
    },
    subscriptions: [{
      _id: new ObjectID(),
      service: new ObjectID(),
      versions: [{
        unitTTCRate: 12,
        estimatedWeeklyVolume: 12,
        evenings: 2,
        sundays: 1,
        startDate: '2018-01-01T10:00:00.000+01:00',
      }],
    }],
    payment: {
      bankAccountOwner: 'David gaudu',
      iban: '',
      bic: '',
      mandates: [{ rum: 'R012345678903456789', _id: new ObjectID() }],
    },
  },
];

const paymentsList = [
  {
    _id: new ObjectID(),
    company: authCompany._id,
    number: 'REG-101031900201',
    date: '2019-05-26T15:47:42',
    customer: paymentCustomerList[0]._id,
    thirdPartyPayer: paymentTppList[0]._id,
    netInclTaxes: 190,
    nature: PAYMENT,
    type: 'direct_debit',
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    number: 'REG-101031900202',
    date: '2019-05-24T15:47:42',
    customer: paymentCustomerList[0]._id,
    netInclTaxes: 390,
    nature: PAYMENT,
    type: 'check',
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    number: 'REMB-101031900201',
    date: '2019-05-27T12:10:20',
    customer: paymentCustomerList[1]._id,
    thirdPartyPayer: paymentTppList[1]._id,
    netInclTaxes: 220,
    nature: REFUND,
    type: 'direct_debit',
  },
];

const paymentNumberList = [
  { prefix: '0319', seq: 203, nature: 'payment', company: authCompany._id },
  { prefix: '0319', seq: 202, nature: 'refund', company: authCompany._id },
];

const paymentUser = {
  _id: new ObjectID(),
  identity: { firstname: 'HelperForCustomer', lastname: 'Test' },
  local: { email: 'helper_for_customer_payment@alenvi.io', password: '123456!eR' },
  refreshToken: uuidv4(),
  role: { client: rolesList.find(role => role.name === 'helper')._id },
  company: authCompany._id,
  origin: WEBAPP,
};

const helpersList = [{
  customer: paymentCustomerList[0]._id,
  user: paymentUser._id,
  company: authCompany._id,
  referent: true,
}];

const userFromOtherCompany = {
  _id: new ObjectID(),
  company: otherCompany._id,
  refreshToken: uuidv4(),
  identity: { firstname: 'toto', lastname: 'toto' },
  role: { client: rolesList.find(role => role.name === 'client_admin')._id },
  local: { email: 'test_other_company@alenvi.io', password: '123456!eR' },
  origin: WEBAPP,
};

const userCompanies = [
  { _id: new ObjectID(), user: paymentUser._id, company: authCompany._id },
  { _id: new ObjectID(), user: userFromOtherCompany._id, company: otherCompany._id },
];

const customerFromOtherCompany = {
  _id: new ObjectID(),
  company: otherCompany._id,
  identity: { firstname: 'customer', lastname: 'toto' },
  contact: {
    primaryAddress: {
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
      street: '37 rue de Ponthieu',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
    phone: '0612345678',
  },
};

const tppFromOtherCompany = {
  _id: new ObjectID(),
  company: otherCompany._id,
  name: 'test',
  isApa: false,
  billingMode: 'direct',
};

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Customer.insertMany(paymentCustomerList);
  await ThirdPartyPayer.insertMany(paymentTppList);
  await Payment.insertMany(paymentsList);
  await PaymentNumber.insertMany(paymentNumberList);
  await UserCompany.insertMany(userCompanies);
  await Helper.insertMany(helpersList);
  await (new User(paymentUser).save());
  await (new User(userFromOtherCompany).save());
  await (new Customer(customerFromOtherCompany).save());
  await (new ThirdPartyPayer(tppFromOtherCompany).save());
};

module.exports = {
  paymentsList,
  populateDB,
  paymentCustomerList,
  paymentUser,
  userFromOtherCompany,
  customerFromOtherCompany,
  tppFromOtherCompany,
};
