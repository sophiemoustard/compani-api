const { ObjectID } = require('mongodb');
const Bill = require('../../../src/models/Bill');
const BillSlip = require('../../../src/models/BillSlip');
const ThirdPartyPayer = require('../../../src/models/ThirdPartyPayer');
const { populateDBForAuthentication, authCompany } = require('./authenticationSeed');

const tppList = [
  { _id: new ObjectID(), name: 'third party payer', company: authCompany._id },
  { _id: new ObjectID(), name: 'tpp', company: authCompany._id },
];

const billSlipList = [
  {
    _id: new ObjectID(),
    month: '11-2019',
    thirdPartyPayer: tppList[0]._id,
    company: authCompany._id,
    number: 'BORD-123456789009',
  },
  {
    _id: new ObjectID(),
    month: '11-2019',
    thirdPartyPayer: tppList[1]._id,
    company: authCompany._id,
    number: 'BORD-123456789001',
  },
  {
    _id: new ObjectID(),
    month: '12-2019',
    thirdPartyPayer: tppList[0]._id,
    company: authCompany._id,
    number: 'BORD-123456789002',
  },
  {
    _id: new ObjectID(),
    month: '12-2019',
    thirdPartyPayer: tppList[1]._id,
    company: authCompany._id,
    number: 'BORD-123456789004',
  },
];

const billList = [
  {
    client: tppList[0]._id,
    date: '2019-12-12T09:00:00',
    netInclTaxes: 100,
    company: authCompany._id,
    customer: new ObjectID(),
    number: '123456',
  },
  {
    client: tppList[0]._id,
    date: '2019-12-12T09:00:00',
    netInclTaxes: 20,
    company: authCompany._id,
    customer: new ObjectID(),
    number: '123454',
  },
  {
    client: tppList[0]._id,
    date: '2019-11-12T09:00:00',
    netInclTaxes: 50,
    company: authCompany._id,
    customer: new ObjectID(),
    number: '123453',
  },
  {
    client: tppList[1]._id,
    date: '2019-12-12T09:00:00',
    netInclTaxes: 70,
    company: authCompany._id,
    customer: new ObjectID(),
    number: '123452',
  },
  {
    client: tppList[1]._id,
    date: '2019-11-12T09:00:00',
    netInclTaxes: 100,
    company: authCompany._id,
    customer: new ObjectID(),
    number: '123451',
  },
];

const populateDB = async () => {
  await Bill.deleteMany({});
  await BillSlip.deleteMany({});
  await ThirdPartyPayer.deleteMany({});

  await populateDBForAuthentication();

  await ThirdPartyPayer.insertMany(tppList);
  await BillSlip.insertMany(billSlipList);
  await Bill.insertMany(billList);
};

module.exports = {
  populateDB,
  tppList,
};
