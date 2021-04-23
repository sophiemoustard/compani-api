const { ObjectID } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const { authCompany, otherCompany, populateDBForAuthentication, rolesList } = require('./authenticationSeed');
const TaxCertificate = require('../../../src/models/TaxCertificate');
const Customer = require('../../../src/models/Customer');
const User = require('../../../src/models/User');
const Payment = require('../../../src/models/Payment');
const Helper = require('../../../src/models/Helper');
const { WEBAPP } = require('../../../src/helpers/constants');

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
  local: { email: 'helper_for_customer_taxcertificates@alenvi.io', password: '123456!eR' },
  refreshToken: uuidv4(),
  role: { client: rolesList.find(role => role.name === 'helper')._id },
  customers: [customersList[0]._id],
  company: authCompany._id,
  origin: WEBAPP,
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

const paymentList = [
  {
    _id: new ObjectID(),
    type: 'cesu',
    nature: 'payment',
    number: 'REG-101031900203',
    date: '2019-05-27T12:10:20',
    netInclTaxes: 1200,
    customer: customersList[0]._id,
    company: authCompany._id,
  },
  {
    _id: new ObjectID(),
    type: 'bank_transfer',
    nature: 'refund',
    number: 'REMB-101031900201',
    date: '2019-05-27T12:10:20',
    netInclTaxes: 70,
    customer: customersList[0]._id,
    company: authCompany._id,
  },
  {
    _id: new ObjectID(),
    type: 'direct_debit',
    number: 'REG-101031900201',
    nature: 'payment',
    date: '2019-05-27T12:10:20',
    netInclTaxes: 490,
    customer: customersList[0]._id,
    company: authCompany._id,
  },
  {
    _id: new ObjectID(),
    type: 'direct_debit',
    number: 'REG-101031900202',
    nature: 'payment',
    date: '2019-05-27T12:10:20',
    netInclTaxes: 600,
    customer: customersList[0]._id,
    company: authCompany._id,
  },
];

const helpersList = [{
  customer: customersList[0]._id,
  user: helper._id,
  company: authCompany._id,
}];

const populateDB = async () => {
  await TaxCertificate.deleteMany();
  await Customer.deleteMany();
  await User.deleteMany();
  await Payment.deleteMany();
  await Helper.deleteMany();

  await populateDBForAuthentication();
  await Customer.insertMany(customersList);
  await TaxCertificate.insertMany(taxCertificatesList);
  await User.create(helper);
  await Payment.insertMany(paymentList);
  await Helper.insertMany(helpersList);
};

module.exports = {
  populateDB,
  customersList,
  taxCertificatesList,
  helper,
};
