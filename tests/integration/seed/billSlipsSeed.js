const { ObjectId } = require('mongodb');
const Bill = require('../../../src/models/Bill');
const BillSlip = require('../../../src/models/BillSlip');
const CreditNote = require('../../../src/models/CreditNote');
const ThirdPartyPayer = require('../../../src/models/ThirdPartyPayer');
const { authCompany, otherCompany } = require('../../seed/authCompaniesSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/db');

const tppList = [
  { _id: new ObjectId(), name: 'third party payer', company: authCompany._id, isApa: true, billingMode: 'direct' },
  { _id: new ObjectId(), name: 'tpp', company: authCompany._id, isApa: false, billingMode: 'direct' },
];

const billSlipList = [
  {
    _id: new ObjectId(),
    month: '11-2019',
    thirdPartyPayer: tppList[0]._id,
    company: authCompany._id,
    number: 'BORD-123456789009',
  },
  {
    _id: new ObjectId(),
    month: '11-2019',
    thirdPartyPayer: tppList[1]._id,
    company: authCompany._id,
    number: 'BORD-123456789001',
  },
  {
    _id: new ObjectId(),
    month: '12-2019',
    thirdPartyPayer: tppList[0]._id,
    company: authCompany._id,
    number: 'BORD-123456789002',
  },
  {
    _id: new ObjectId(),
    month: '12-2019',
    thirdPartyPayer: tppList[1]._id,
    company: authCompany._id,
    number: 'BORD-123456789004',
  },
];

const billList = [
  {
    thirdPartyPayer: tppList[0]._id,
    type: 'automatic',
    date: '2019-12-12T09:00:00',
    netInclTaxes: 100,
    company: authCompany._id,
    customer: new ObjectId(),
    number: '123456',
  },
  {
    thirdPartyPayer: tppList[0]._id,
    type: 'automatic',
    date: '2019-12-12T09:00:00',
    netInclTaxes: 20,
    company: authCompany._id,
    customer: new ObjectId(),
    number: '123454',
  },
  {
    thirdPartyPayer: tppList[0]._id,
    type: 'automatic',
    date: '2019-11-12T09:00:00',
    netInclTaxes: 50,
    company: authCompany._id,
    customer: new ObjectId(),
    number: '123453',
  },
  {
    thirdPartyPayer: tppList[1]._id,
    type: 'automatic',
    date: '2019-12-12T09:00:00',
    netInclTaxes: 70,
    company: authCompany._id,
    customer: new ObjectId(),
    number: '123452',
  },
  {
    thirdPartyPayer: tppList[1]._id,
    type: 'automatic',
    date: '2019-11-12T09:00:00',
    netInclTaxes: 100,
    company: authCompany._id,
    customer: new ObjectId(),
    number: '123451',
  },
];

const creditNotesList = [
  {
    thirdPartyPayer: tppList[1]._id,
    date: '2019-11-01T09:00:00',
    inclTaxesTpp: 10,
    exclTaxesTpp: 8,
    customer: billList[3].customer,
    company: authCompany._id,
    number: '123451',
  },
  {
    thirdPartyPayer: tppList[1]._id,
    date: '2019-09-01T09:00:00',
    inclTaxesTpp: 20,
    exclTaxesTpp: 15,
    customer: billList[3].customer,
    company: authCompany._id,
    number: '123451',
  },
];

const billSlipFromAnotherCompany = {
  _id: new ObjectId(),
  month: '11-2019',
  thirdPartyPayer: new ObjectId(),
  company: otherCompany._id,
  number: 'BORD-123456745009',
};

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([
    Bill.create(billList),
    BillSlip.create([...billSlipList, billSlipFromAnotherCompany]),
    CreditNote.create(creditNotesList),
    ThirdPartyPayer.create(tppList),
  ]);
};

module.exports = {
  populateDB,
  billSlipList,
  billSlipFromAnotherCompany,
};
