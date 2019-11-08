const { ObjectID } = require('mongodb');
const moment = require('moment');
const uuidv4 = require('uuid/v4');
const Payment = require('../../../src/models/Payment');
const Customer = require('../../../src/models/Customer');
const ThirdPartyPayer = require('../../../src/models/ThirdPartyPayer');
const PaymentNumber = require('../../../src/models/PaymentNumber');
const Company = require('../../../src/models/Company');
const User = require('../../../src/models/User');
const { PAYMENT, REFUND } = require('../../../src/helpers/constants');
const { populateDBForAuthentication, userList, rolesList, authCompany } = require('./authenticationSeed');

const paymentTppList = [
  {
    _id: new ObjectID(),
    name: 'Toto',
    company: authCompany._id,
  },
  {
    _id: new ObjectID(),
    name: 'Tata',
    company: authCompany._id,
  },
];

const paymentCustomerList = [
  {
    _id: new ObjectID(),
    email: 'tito@ty.com',
    identity: {
      title: 'mr',
      firstname: 'Egan',
      lastname: 'Bernal',
    },
    contact: {
      primaryAddress: {
        fullAddress: '37 rue de ponthieu 75008 Paris',
        zipCode: '75008',
        city: 'Paris',
      },
      phone: '0612345678',
    },
    payment: {
      bankAccountOwner: 'Lance Amstrong',
      iban: 'FR3514508000505917721779B12',
      bic: 'BNMDHISOBD',
      mandates: [
        { rum: 'R09876543456765432', _id: new ObjectID(), signedAt: moment().toDate() },
      ],
    },
    subscriptions: [
      {
        _id: new ObjectID(),
        service: new ObjectID(),
        versions: [{
          unitTTCRate: 12,
          estimatedWeeklyVolume: 12,
          evenings: 2,
          sundays: 1,
          startDate: '2018-01-01T10:00:00.000+01:00',
        }],
      },
    ],
  },
  {
    _id: new ObjectID(),
    email: 'fake@test.com',
    identity: {
      title: 'mr',
      firstname: 'Romain',
      lastname: 'Bardet',
    },
    subscriptions: [
      {
        _id: new ObjectID(),
        service: new ObjectID(),
        versions: [{
          unitTTCRate: 12,
          estimatedWeeklyVolume: 12,
          evenings: 2,
          sundays: 1,
          startDate: '2018-01-01T10:00:00.000+01:00',
        }],
      },
    ],
    payment: {
      bankAccountOwner: 'David gaudu',
      iban: '',
      bic: '',
      mandates: [
        { rum: 'R012345678903456789', _id: new ObjectID() },
      ],
    },
  },
];

const paymentsList = [
  {
    _id: new ObjectID(),
    number: 'REG-1903201',
    date: '2019-05-26T15:47:42',
    customer: paymentCustomerList[0]._id,
    client: paymentTppList[0]._id,
    netInclTaxes: 190,
    nature: PAYMENT,
    type: 'direct_debit',
  },
  {
    _id: new ObjectID(),
    number: 'REG-1903202',
    date: '2019-05-24T15:47:42',
    customer: paymentCustomerList[0]._id,
    netInclTaxes: 390,
    nature: PAYMENT,
    type: 'check',
  },
  {
    _id: new ObjectID(),
    number: 'REG-1903203',
    date: '2019-05-27T12:10:20',
    customer: paymentCustomerList[1]._id,
    client: paymentTppList[1]._id,
    netInclTaxes: 220,
    nature: REFUND,
    type: 'direct_debit',
  },
];

const company = {
  _id: new ObjectID(),
  name: 'Alenvi',
  tradeName: 'TT',
  iban: 'paiement',
  bic: 'money',
  ics: 'kesako',
  directDebitsFolderId: '1234567890',
};

const paymentUser = {
  _id: new ObjectID(),
  identity: { firstname: 'HelperForCustomer', lastname: 'Test' },
  local: { email: 'helper_for_customer_payment@alenvi.io', password: '123456' },
  refreshToken: uuidv4(),
  role: rolesList.find(role => role.name === 'helper')._id,
  customers: [paymentCustomerList[0]._id],
  company: authCompany._id,
};

const populateDB = async () => {
  await PaymentNumber.deleteMany({});
  await Payment.deleteMany({});
  await ThirdPartyPayer.deleteMany({});
  await Customer.deleteMany({});
  await User.deleteMany({});

  await populateDBForAuthentication();
  await Customer.insertMany(paymentCustomerList);
  await ThirdPartyPayer.insertMany(paymentTppList);
  await Payment.insertMany(paymentsList);
  await (new User(paymentUser).save());
};

const populateDBWithCompany = async () => {
  await PaymentNumber.deleteMany({});
  await Payment.deleteMany({});
  await ThirdPartyPayer.deleteMany({});
  await Customer.deleteMany({});
  await Company.deleteMany({});

  await populateDBForAuthentication();
  await Customer.insertMany(paymentCustomerList);
  await ThirdPartyPayer.insertMany(paymentTppList);
  await Payment.insertMany(paymentsList);
  await new Company(company).save();
  await (new User(paymentUser).save());

  const role = rolesList.find(r => r.name === 'admin');
  const user = userList.find(u => u.role.toHexString() === role._id.toHexString());
  await User.findOneAndUpdate({ _id: user._id }, { company: company._id });
};

module.exports = {
  paymentsList,
  populateDB,
  populateDBWithCompany,
  paymentCustomerList,
  paymentUser,
};
