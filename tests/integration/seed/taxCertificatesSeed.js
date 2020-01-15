const { ObjectID } = require('mongodb');
const uuidv4 = require('uuid/v4');
const { authCompany, otherCompany, populateDBForAuthentication, rolesList } = require('./authenticationSeed');
const TaxCertificate = require('../../../src/models/TaxCertificate');
const Customer = require('../../../src/models/Customer');
const User = require('../../../src/models/User');

const customersList = [
  {
    _id: new ObjectID(),
    company: authCompany._id,
    identity: { lastname: 'Picsou', title: 'mr' },
    contact: {
      primaryAddress: {
        fullAddress: '37 rue de ponthieu 75008 Paris',
        zipCode: '75008',
        city: 'Paris',
        street: '37 rue de Ponthieu',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
    },
  }, {
    _id: new ObjectID(),
    company: otherCompany._id,
    identity: { lastname: 'Donald', title: 'mr' },
    contact: {
      primaryAddress: {
        fullAddress: '37 rue de ponthieu 75008 Paris',
        zipCode: '75008',
        city: 'Paris',
        street: '37 rue de Ponthieu',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
    },
  },
];

const helper = {
  _id: new ObjectID(),
  identity: { firstname: 'HelperForCustomer', lastname: 'Test' },
  local: { email: 'helper_for_customer_taxcertificates@alenvi.io', password: '123456' },
  refreshToken: uuidv4(),
  role: rolesList.find(role => role.name === 'helper')._id,
  customers: [customersList[0]._id],
  company: authCompany._id,
};

const taxCertificatesList = [
  {
    _id: new ObjectID(),
    company: authCompany._id,
    customer: customersList[0]._id,
    year: '2019',
  },
  {
    _id: new ObjectID(),
    company: authCompany._id,
    customer: customersList[0]._id,
    year: '2020',
  },
  {
    _id: new ObjectID(),
    company: otherCompany._id,
    customer: customersList[1]._id,
    year: '2019',
  },
];

const populateDB = async () => {
  await TaxCertificate.deleteMany();
  await Customer.deleteMany();
  await User.deleteMany();
  await populateDBForAuthentication();
  await Customer.insertMany(customersList);
  await TaxCertificate.insertMany(taxCertificatesList);
  await User.create(helper);
};

module.exports = {
  populateDB,
  customersList,
  taxCertificatesList,
  helper,
};
