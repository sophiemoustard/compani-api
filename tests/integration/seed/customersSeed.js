const { ObjectID } = require('mongodb');
const faker = require('faker');
const moment = require('moment');

const Customer = require('../../../models/Customer');
const { servicesList } = require('./servicesSeed');
const { thirdPartyPayersList } = require('./thirdPartyPayersSeed');
const { ONCE, FIXED } = require('../../../helpers/constants');

faker.locale = 'fr';

const subId = new ObjectID();
const customersList = [
  {
    _id: new ObjectID(),
    email: faker.internet.email(),
    identity: {
      title: faker.name.title(),
      firstname: faker.name.firstName(),
      lastname: faker.name.lastName(),
      birthDate: faker.date.past(),
    },
    contact: {
      address: {
        street: faker.address.streetAddress(),
        zipCode: faker.address.zipCode(),
        city: faker.address.city(),
        location: {
          type: 'Point',
          coordinates: [faker.address.latitude(), faker.address.longitude()],
        },
      },
      phone: faker.phone.phoneNumber(),
    },
    followUp: {
      pathology: faker.lorem.word(),
      comments: faker.lorem.sentences(4),
      details: faker.lorem.paragraph(4),
      misc: faker.lorem.sentence(),
    },
    payment: {
      bankAccountOwner: `${faker.name.firstName()} ${faker.name.lastName()}`,
      iban: faker.finance.iban(),
      bic: faker.finance.bic(),
      mandates: [
        {
          rum: faker.helpers.randomize(),
          _id: new ObjectID(),
          signedAt: moment().toDate(),
        },
      ],
    },
    subscriptions: [
      {
        _id: subId,
        service: servicesList[0]._id,
        versions: [{
          unitTTCRate: 12,
          estimatedWeeklyVolume: 12,
          evenings: 2,
          sundays: 1,
          startDate: '2018-01-01T10:00:00.000+01:00',
        }],
      },
      {
        _id: new ObjectID(),
        service: servicesList[0]._id,
        versions: [{
          unitTTCRate: 12,
          estimatedWeeklyVolume: 12,
          evenings: 2,
          sundays: 1,
          startDate: moment().subtract(1, 'month').toDate(),
        }],
      },
      {
        _id: new ObjectID(),
        service: servicesList[2]._id,
        versions: [{
          unitTTCRate: 150,
          estimatedWeeklyVolume: 3,
          evenings: 0,
          sundays: 0,
          startDate: moment().subtract(1, 'month').toDate(),
        }],
      },
    ],
    fundings: [
      {
        _id: new ObjectID(),
        nature: FIXED,
        thirdPartyPayer: thirdPartyPayersList[0]._id,
        subscription: subId,
        versions: [{
          folderNumber: 'D123456',
          startDate: moment.utc().toDate(),
          frequency: ONCE,
          endDate: moment.utc().add(6, 'months').toDate(),
          effectiveDate: moment.utc().toDate(),
          amountTTC: 120,
          customerParticipationRate: 10,
          careDays: [0, 1, 2, 3, 4, 5, 6],
        }],
      },
    ],
    quotes: [{
      _id: new ObjectID(),
      subscriptions: [{
        serviceName: 'Test',
        unitTTCRate: 23,
        estimatedWeeklyVolume: 3,
      }, {
        serviceName: 'Test2',
        unitTTCRate: 30,
        estimatedWeeklyVolume: 10,
      }],
    }],
  },
  {
    _id: new ObjectID(),
    email: faker.internet.email(),
    identity: {
      title: faker.name.title(),
      firstname: faker.name.firstName(),
      lastname: faker.name.lastName(),
      birthDate: faker.date.past(),
    },
    contact: {
      address: {
        street: faker.address.streetAddress(),
        zipCode: faker.address.zipCode(),
        city: faker.address.city(),
        location: [faker.address.latitude(), faker.address.longitude()],
      },
      phone: faker.phone.phoneNumber(),
    },
    followUp: {
      pathology: faker.lorem.word(),
      comments: faker.lorem.sentences(4),
      details: faker.lorem.paragraph(4),
      misc: faker.lorem.sentence(),
    },
    payment: {
      bankAccountOwner: `${faker.name.firstName()} ${faker.name.lastName()}`,
      iban: faker.finance.iban(),
      bic: faker.finance.bic(),
      mandates: [
        { rum: faker.helpers.randomize(), _id: new ObjectID(), signedAt: moment().toDate() },
      ],
    },
  },
  {
    _id: new ObjectID(),
    email: faker.internet.email(),
    identity: {
      title: faker.name.title(),
      firstname: faker.name.firstName(),
      lastname: faker.name.lastName(),
      birthDate: faker.date.past(),
    },
    contact: {
      address: {
        street: faker.address.streetAddress(),
        zipCode: faker.address.zipCode(),
        city: faker.address.city(),
        location: {
          type: 'Point',
          coordinates: [faker.address.latitude(), faker.address.longitude()],
        },
      },
      phone: faker.phone.phoneNumber(),
    },
    followUp: {
      pathology: faker.lorem.word(),
      comments: faker.lorem.sentences(4),
      details: faker.lorem.paragraph(4),
      misc: faker.lorem.sentence(),
    },
    payment: {
      bankAccountOwner: `${faker.name.firstName()} ${faker.name.lastName()}`,
      iban: '',
      bic: '',
      mandates: [
        { rum: faker.helpers.randomize() },
      ],
    },
  },
];

const populateCustomers = async () => {
  await Customer.deleteMany({});
  await Customer.insertMany(customersList);
};

module.exports = { customersList, populateCustomers };
