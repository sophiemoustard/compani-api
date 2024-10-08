const { ObjectId } = require('mongodb');

const authCompany = {
  _id: new ObjectId(),
  name: 'Test SAS',
  prefixNumber: 101,
  iban: '1234',
  bic: '5678',
  folderId: '0987654321',
  directDebitsFolderId: '1234567890',
  customersFolderId: 'mnbvcxz',
  auxiliariesFolderId: 'iuytre',
  address: {
    fullAddress: '37 rue de Ponthieu 75008 Paris',
    city: 'Paris',
    street: '37 rue de Ponthieu',
    zipCode: '75008',
    location: { type: 'Point', coordinates: [0, 0] },
  },
  subscriptions: { erp: true },
};

const otherCompany = {
  _id: new ObjectId(),
  name: 'Un autre SAS',
  prefixNumber: 106,
  iban: '4321',
  bic: '8765',
  folderId: '2345678901',
  directDebitsFolderId: '1234567890',
  customersFolderId: 'zxcvbnm',
  auxiliariesFolderId: 'ijnuhb',
  address: {
    fullAddress: '12 rue de Ponthieu 75008 Paris',
    city: 'Paris',
    street: '12 rue de Ponthieu',
    zipCode: '75008',
    location: { type: 'Point', coordinates: [0, 0] },
  },
  subscriptions: { erp: true },
};

const companyWithoutSubscription = {
  _id: new ObjectId(),
  name: 'Test SAS withtout subscription',
  prefixNumber: 103,
  iban: '1234',
  bic: '5678',
  folderId: '1234567890',
  directDebitsFolderId: '1234567890',
  customersFolderId: 'qwerty',
  auxiliariesFolderId: 'asdfgh',
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
