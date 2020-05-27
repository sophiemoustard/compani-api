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
    templates: { debitMandate: { driveId: process.env.ESIGN_TEST_DOC_DRIVEID } },
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

const companyWithoutSubscription = {
  _id: new ObjectID(),
  name: 'Test SAS withtout subscription',
  tradeName: 'eh oh eh oh',
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

module.exports = { authCompany, companyWithoutSubscription };
