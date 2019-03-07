const { ObjectID } = require('mongodb');
const faker = require('faker');
const moment = require('moment');

const Customer = require('../../../models/Customer');
const { companiesList } = require('./companiesSeed');
const { servicesList } = require('./servicesSeed');
const { MONTHLY, FIXED } = require('../../../helpers/constants');

faker.locale = 'fr';

const customersList = [
  {
    _id: new ObjectID(),
    email: faker.internet.email(),
    identity: {
      title: faker.name.title(),
      firstname: faker.name.firstName(),
      lastname: faker.name.lastName(),
      birthDate: faker.date.past()
    },
    sectors: ['1e*'],
    contact: {
      ogustAddressId: faker.random.number({ max: 8 }).toString(),
      address: {
        street: faker.address.streetAddress(),
        zipCode: faker.address.zipCode(),
        city: faker.address.city(),
        location: [faker.address.latitude(), faker.address.longitude()]
      },
      phone: faker.phone.phoneNumber()
    },
    followUp: {
      pathology: faker.lorem.word(),
      comments: faker.lorem.sentences(4),
      details: faker.lorem.paragraph(4),
      misc: faker.lorem.sentence()
    },
    payment: {
      bankAccountOwner: `${faker.name.firstName()} ${faker.name.lastName()}`,
      iban: faker.finance.iban(),
      bic: faker.finance.bic(),
      mandates: [
        {
          rum: faker.helpers.randomize(),
          _id: new ObjectID(),
        },
      ],
    },
    subscriptions: [
      {
        _id: new ObjectID(),
        service: servicesList[0]._id,
        versions: [{
          unitTTCRate: 12,
          estimatedWeeklyVolume: 12,
          evenings: 2,
          sundays: 1,
        }],
      }
    ],
    quotes: [{
      _id: new ObjectID(),
      subscriptions: [{
        serviceName: 'Test',
        unitTTCRate: 23,
        estimatedWeeklyVolume: 3
      }, {
        serviceName: 'Test2',
        unitTTCRate: 30,
        estimatedWeeklyVolume: 10
      }]
    }]
  },
  {
    _id: new ObjectID(),
    email: faker.internet.email(),
    identity: {
      title: faker.name.title(),
      firstname: faker.name.firstName(),
      lastname: faker.name.lastName(),
      birthDate: faker.date.past()
    },
    sectors: ['1e*'],
    contact: {
      ogustAddressId: faker.random.number({ max: 8 }).toString(),
      address: {
        street: faker.address.streetAddress(),
        zipCode: faker.address.zipCode(),
        city: faker.address.city(),
        location: [faker.address.latitude(), faker.address.longitude()]
      },
      phone: faker.phone.phoneNumber()
    },
    followUp: {
      pathology: faker.lorem.word(),
      comments: faker.lorem.sentences(4),
      details: faker.lorem.paragraph(4),
      misc: faker.lorem.sentence()
    },
    payment: {
      bankAccountOwner: `${faker.name.firstName()} ${faker.name.lastName()}`,
      iban: faker.finance.iban(),
      bic: faker.finance.bic(),
      mandates: [
        { rum: faker.helpers.randomize() },
      ],
    },
    fundings: [
      {
        _id: new ObjectID(),
        nature: FIXED,
        thirdPartyPayer: companiesList[0].customersConfig.thirdPartyPayers[0]._id,
        services: [servicesList[0]._id],
        versions: [{
          folderNumber: 'D123456',
          startDate: moment.utc().toDate(),
          frequency: MONTHLY,
          endDate: moment.utc().add(6, 'months').toDate(),
          effectiveDate: moment.utc().toDate(),
          amountTTC: 120,
          customerParticipationRate: 10,
          careDays: [2, 5],
        }]
      },
      {
        _id: new ObjectID(),
        nature: FIXED,
        folderNumber: 'D7890',
        startDate: moment.utc().toDate(),
        thirdPartyPayer: companiesList[0].customersConfig.thirdPartyPayers[0]._id,
        versions: [{
          frequency: MONTHLY,
          endDate: moment.utc().add(2, 'years').toDate(),
          effectiveDate: moment.utc().add(1, 'year').toDate(),
          amountTTC: 90,
          customerParticipationRate: 0,
          careDays: [5, 6],
          services: [servicesList[0]._id]
        }]
      }
    ]
  },
  {
    _id: new ObjectID(),
    email: faker.internet.email(),
    identity: {
      title: faker.name.title(),
      firstname: faker.name.firstName(),
      lastname: faker.name.lastName(),
      birthDate: faker.date.past()
    },
    sectors: ['1e*'],
    contact: {
      ogustAddressId: faker.random.number({ max: 8 }).toString(),
      address: {
        street: faker.address.streetAddress(),
        zipCode: faker.address.zipCode(),
        city: faker.address.city(),
        location: [faker.address.latitude(), faker.address.longitude()]
      },
      phone: faker.phone.phoneNumber()
    },
    followUp: {
      pathology: faker.lorem.word(),
      comments: faker.lorem.sentences(4),
      details: faker.lorem.paragraph(4),
      misc: faker.lorem.sentence()
    },
    payment: {
      bankAccountOwner: `${faker.name.firstName()} ${faker.name.lastName()}`,
      iban: '',
      bic: '',
      mandates: [
        { rum: faker.helpers.randomize() },
      ],
    }
  }
];

const populateCustomers = async () => {
  await Customer.remove({});
  await Customer.insertMany(customersList);
};

module.exports = { customersList, populateCustomers };
