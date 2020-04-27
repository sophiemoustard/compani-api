const { ObjectID } = require('mongodb');
const { authCompany } = require('./companySeed');
const { serviceList } = require('./serviceSeed');

const customerList = [
  {
    _id: new ObjectID(),
    company: authCompany._id,
    email: 'fake@test.com',
    identity: {
      title: 'mr',
      firstname: 'Romain',
      lastname: 'Bardet',
    },
    contact: {
      primaryAddress: {
        fullAddress: '37 rue de ponthieu 75008 Paris',
        zipCode: '75008',
        city: 'Paris',
        street: '37 rue de Ponthieu',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
      secondaryAddress: {
        fullAddress: '27 rue des renaudes 75017 Paris',
        zipCode: '75017',
        city: 'Paris',
        street: '27 rue des renaudes',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
      phone: '0123456789',
      accessCodes: 'porte c3po',
    },
    followUp: {
      environment: 'ne va pas bien',
      objectives: 'preparer le dejeuner + balade',
      misc: 'code porte: 1234',
    },
    subscriptions: [{
      _id: new ObjectID(),
      service: serviceList[0]._id,
      versions: [{
        unitTTCRate: 12,
        estimatedWeeklyVolume: 12,
        evenings: 2,
        sundays: 1,
      }],
    }],
    subscriptionsHistory: [],
    payment: {
      bankAccountOwner: 'David gaudu',
      iban: '',
      bic: '',
      mandates: [
        { rum: 'R012345678903456789' },
      ],
    },
    quotes: [],
    fundings: [],
  },
];

module.exports = { customerList };
