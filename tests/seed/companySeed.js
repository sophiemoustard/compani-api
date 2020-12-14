const { ObjectID } = require('mongodb');

const authCompany = {
  _id: new ObjectID(),
  name: 'Test SAS',
  tradeName: 'Test',
  prefixNumber: 101,
  iban: '1234',
  bic: '5678',
  ics: '9876',
  folderId: '0987654321',
  directDebitsFolderId: '1234567890',
  customersFolderId: 'mnbvcxz',
  auxiliariesFolderId: 'iuytre',
  customersConfig: {
    templates: { debitMandate: { driveId: '12345' } },
    billingPeriod: 'two_weeks',
  },
  address: {
    fullAddress: '37 rue de Ponthieu 75008 Paris',
    city: 'Paris',
    street: '37 rie de Ponthieu',
    zipCode: '75008',
    location: { type: 'Point', coordinates: [0, 0] },
  },
  subscriptions: { erp: true },
  billingAssistance: 'assistance@billing.eu',
};

const otherCompany = {
  _id: new ObjectID(),
  name: 'Un autre SAS',
  tradeName: 'Paslameme',
  prefixNumber: 106,
  iban: '4321',
  bic: '8765',
  ics: '0674',
  folderId: '2345678901',
  directDebitsFolderId: '1234567890',
  customersFolderId: 'zxcvbnm',
  auxiliariesFolderId: 'ijnuhb',
  customersConfig: {
    templates: { debitMandate: { driveId: '12345' } },
    billingPeriod: 'two_weeks',
  },
  address: {
    fullAddress: '12 rue de Ponthieu 75008 Paris',
    city: 'Paris',
    street: '12 rue de Ponthieu',
    zipCode: '75008',
    location: { type: 'Point', coordinates: [0, 0] },
  },
  subscriptions: { erp: true },
  billingAssistance: 'paslameme@billing.eu',
};

const companyWithoutSubscription = {
  _id: new ObjectID(),
  name: 'Test SAS withtout subscription',
  tradeName: 'ehohehoh',
  prefixNumber: 103,
  iban: '1234',
  bic: '5678',
  ics: '9876',
  folderId: '1234567890',
  directDebitsFolderId: '1234567890',
  customersFolderId: 'qwerty',
  auxiliariesFolderId: 'asdfgh',
  customersConfig: { billingPeriod: 'two_weeks' },
  subscriptions: { erp: false },
};

module.exports = { authCompany, companyWithoutSubscription, otherCompany };
