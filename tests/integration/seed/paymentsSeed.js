const { ObjectId } = require('mongodb');
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');
const Payment = require('../../../src/models/Payment');
const Customer = require('../../../src/models/Customer');
const ThirdPartyPayer = require('../../../src/models/ThirdPartyPayer');
const PaymentNumber = require('../../../src/models/PaymentNumber');
const User = require('../../../src/models/User');
const { PAYMENT, REFUND, WEBAPP } = require('../../../src/helpers/constants');
const { authCompany, otherCompany } = require('../../seed/authCompaniesSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');
const UserCompany = require('../../../src/models/UserCompany');
const Helper = require('../../../src/models/Helper');
const { helperRoleId, clientAdminRoleId } = require('../../seed/authRolesSeed');

const paymentTppList = [
  { _id: new ObjectId(), name: 'Toto', company: authCompany._id, isApa: true, billingMode: 'direct' },
  { _id: new ObjectId(), name: 'Tata', company: authCompany._id, isApa: true, billingMode: 'direct' },
];

const paymentCustomerList = [
  {
    _id: new ObjectId(),
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
      mandates: [{ rum: 'R09876543456765432', _id: new ObjectId(), signedAt: moment().toDate() }],
    },
    subscriptions: [{
      _id: new ObjectId(),
      service: new ObjectId(),
      versions: [{
        unitTTCRate: 12,
        weeklyHours: 12,
        evenings: 2,
        sundays: 1,
        startDate: '2018-01-01T10:00:00.000+01:00',
      }],
    }],
  },
  {
    _id: new ObjectId(),
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
      _id: new ObjectId(),
      service: new ObjectId(),
      versions: [{
        unitTTCRate: 12,
        weeklyHours: 12,
        evenings: 2,
        sundays: 1,
        startDate: '2018-01-01T10:00:00.000+01:00',
      }],
    }],
    payment: {
      bankAccountOwner: 'David gaudu',
      iban: '',
      bic: '',
      mandates: [{ rum: 'R012345678903456789', _id: new ObjectId() }],
    },
  },
  { // 2 - archived customer
    _id: new ObjectId(),
    company: authCompany._id,
    identity: { title: 'mr', firstname: 'Edgar', lastname: 'Chivé' },
    stopReason: 'hospitalization',
    stoppedAt: '2021-10-10T21:59:59',
    archivedAt: '2021-10-17T11:58:14',
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
      mandates: [{ rum: 'R09876543456765432', _id: new ObjectId(), signedAt: moment().toDate() }],
    },
    subscriptions: [{
      _id: new ObjectId(),
      service: new ObjectId(),
      versions: [{
        unitTTCRate: 12,
        weeklyHours: 12,
        evenings: 2,
        sundays: 1,
        startDate: '2018-01-01T10:00:00.000+01:00',
      }],
    }],
  },
];

const paymentsList = [
  {
    _id: new ObjectId(),
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
    _id: new ObjectId(),
    company: authCompany._id,
    number: 'REG-101031900202',
    date: '2019-05-24T15:47:42',
    customer: paymentCustomerList[0]._id,
    netInclTaxes: 390,
    nature: PAYMENT,
    type: 'check',
  },
  {
    _id: new ObjectId(),
    company: authCompany._id,
    number: 'REMB-101031900201',
    date: '2019-05-27T12:10:20',
    customer: paymentCustomerList[1]._id,
    thirdPartyPayer: paymentTppList[1]._id,
    netInclTaxes: 220,
    nature: REFUND,
    type: 'direct_debit',
  },
  { // 3 - archived customer
    _id: new ObjectId(),
    company: authCompany._id,
    number: 'REMB-101031900202',
    date: '2019-05-27T12:10:20',
    customer: paymentCustomerList[2]._id,
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
  _id: new ObjectId(),
  identity: { firstname: 'HelperForCustomer', lastname: 'Test' },
  local: { email: 'helper_for_customer_payment@alenvi.io' },
  refreshToken: uuidv4(),
  role: { client: helperRoleId },
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
  _id: new ObjectId(),
  company: otherCompany._id,
  refreshToken: uuidv4(),
  identity: { firstname: 'toto', lastname: 'toto' },
  role: { client: clientAdminRoleId },
  local: { email: 'test_other_company@alenvi.io', password: '123456!eR' },
  origin: WEBAPP,
};

const userCompanies = [
  // old inactive user company
  {
    _id: new ObjectId(),
    user: paymentUser._id,
    company: otherCompany._id,
    startDate: '2022-01-01T23:00:00.000Z',
    endDate: '2022-11-30T23:00:00.000Z',
  },
  { _id: new ObjectId(), user: paymentUser._id, company: authCompany._id },
  { _id: new ObjectId(), user: userFromOtherCompany._id, company: otherCompany._id },
];

const customerFromOtherCompany = {
  _id: new ObjectId(),
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
  _id: new ObjectId(),
  company: otherCompany._id,
  name: 'test',
  isApa: false,
  billingMode: 'direct',
};

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([
    Customer.create(paymentCustomerList),
    ThirdPartyPayer.create(paymentTppList),
    Payment.create(paymentsList),
    PaymentNumber.create(paymentNumberList),
    UserCompany.create(userCompanies),
    Helper.create(helpersList),
    User.create(paymentUser, userFromOtherCompany),
    Customer.create(customerFromOtherCompany),
    ThirdPartyPayer.create(tppFromOtherCompany),
  ]);
};

module.exports = {
  paymentsList,
  populateDB,
  paymentCustomerList,
  userFromOtherCompany,
  customerFromOtherCompany,
  tppFromOtherCompany,
};
