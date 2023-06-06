const { ObjectId } = require('mongodb');

const authCompany = {
  _id: new ObjectId(),
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
    templates: {
      debitMandate: {
        driveId: '1EosL9GhGBZvrvnrF5o__TOHnponTGlE0',
        link: 'https://docs.google.com/document/d/1EosL9GhGBZvrvnrF5o__TOHnponTGlE0/edit',
      },
    },
    billingPeriod: 'two_weeks',
  },
  address: {
    fullAddress: '37 rue de Ponthieu 75008 Paris',
    city: 'Paris',
    street: '37 rue de Ponthieu',
    zipCode: '75008',
    location: { type: 'Point', coordinates: [0, 0] },
  },
  subscriptions: { erp: true },
  billingAssistance: 'assistance@billing.eu',
  rhConfig: {
    amountPerKm: 0.22,
    phoneFeeAmount: 18,
    shouldPayHolidays: true,
  },
};

const otherCompany = {
  _id: new ObjectId(),
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
  _id: new ObjectId(),
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

const authHolding = { _id: new ObjectId(), name: 'Auth Holding' };
const otherHolding = { _id: new ObjectId(), name: 'Other Holding' };

const companyHoldingList = [
  { _id: new ObjectId(), holding: authHolding._id, company: authCompany._id },
  { _id: new ObjectId(), holding: otherHolding._id, company: otherCompany._id },
  { _id: new ObjectId(), holding: otherHolding._id, company: companyWithoutSubscription._id },
];

module.exports = {
  authCompany,
  companyWithoutSubscription,
  otherCompany,
  authHolding,
  otherHolding,
  companyHoldingList,
};
