const { ObjectID } = require('mongodb');
const faker = require('faker');

const Customer = require('../../models/Customer');

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
      bic: faker.finance.bic()
    },
    subscriptions: [
      {
        _id: new ObjectID(),
        service: 'Subscritpion',
        unitTTCRate: 12,
        estimatedWeeklyVolume: 12,
        evenings: true,
        sundays: false
      }
    ],
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
      bic: faker.finance.bic()
    }
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
      bic: faker.finance.bic()
    }
  }
];

const populateCustomers = async () => {
  await Customer.remove({});
  await Customer.insertMany(customersList);
};

module.exports = { customersList, populateCustomers };
