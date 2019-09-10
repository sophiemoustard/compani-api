const { ObjectID } = require('mongodb');
const moment = require('moment');
const CreditNote = require('../../../models/CreditNote');
const Customer = require('../../../models/Customer');
const Event = require('../../../models/Event');
const Service = require('../../../models/Service');
const CreditNoteNumber = require('../../../models/CreditNoteNumber');
const { COMPANY_CONTRACT, HOURLY } = require('../../../helpers/constants');
const { populateDBForAuthentification } = require('./authentificationSeed');

const creditNoteThirdPartyPayer = {
  _id: new ObjectID(),
  name: 'Toto',
};

const creditNoteService = {
  _id: new ObjectID(),
  type: COMPANY_CONTRACT,
  company: new ObjectID(),
  versions: [{
    defaultUnitAmount: 12,
    name: 'Service 1',
    startDate: '2019-01-16 17:58:15.519',
    vat: 12,
  }],
  nature: HOURLY,
};

const creditNoteCustomer = {
  _id: new ObjectID(),
  email: 'tito@ty.com',
  identity: {
    title: 'M',
    firstname: 'Egan',
    lastname: 'Bernal',
  },
  contact: {
    address: {
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
    },
    phone: '0612345678',
  },
  payment: {
    bankAccountOwner: 'Lance Amstrong',
    iban: 'FR3514508000505917721779B12',
    bic: 'BNMDHISOBD',
    mandates: [
      { rum: 'R09876543456765432', _id: new ObjectID(), signedAt: moment().toDate() },
    ],
  },
  subscriptions: [
    {
      _id: new ObjectID(),
      service: creditNoteService._id,
      versions: [{
        unitTTCRate: 12,
        estimatedWeeklyVolume: 12,
        evenings: 2,
        sundays: 1,
        startDate: '2018-01-01T10:00:00.000+01:00',
      }],
    },
  ],
};

const creditNoteEvent = {
  _id: new ObjectID(),
  sector: new ObjectID(),
  type: 'intervention',
  status: 'contract_with_company',
  startDate: '2019-01-16T09:30:19.543Z',
  endDate: '2019-01-16T11:30:21.653Z',
  auxiliary: new ObjectID(),
  customer: creditNoteCustomer._id,
  createdAt: '2019-01-15T11:33:14.343Z',
  subscription: creditNoteCustomer.subscriptions[0]._id,
  isBilled: true,
  bills: {
    thirdPartyPayer: creditNoteThirdPartyPayer._id,
    inclTaxesCustomer: 20,
    exclTaxesCustomer: 15,
    inclTaxesTpp: 10,
    exclTaxesTpp: 5,
    fundingId: new ObjectID(),
    nature: 'hourly',
    careHours: 2,
  },
};

const creditNotesList = [
  {
    _id: new ObjectID(),
    date: moment().toDate(),
    startDate: moment().startOf('month').toDate(),
    endDate: moment().set('date', 15).toDate(),
    customer: creditNoteCustomer._id,
    exclTaxes: 100,
    inclTaxes: 112,
    events: [{
      eventId: creditNoteEvent._id,
      auxiliary: creditNoteEvent.auxiliary,
      startDate: creditNoteEvent.startDate,
      endDate: creditNoteEvent.endDate,
      bills: {
        inclTaxesCustomer: 10,
        exclTaxesCustomer: 8,
      },
    }],
    origin: 'compani',
  },
];

const populateDB = async () => {
  await CreditNote.deleteMany({});
  await Event.deleteMany({});
  await Customer.deleteMany({});
  await Service.deleteMany({});
  await CreditNoteNumber.deleteMany({});

  await populateDBForAuthentification();
  await new Event(creditNoteEvent).save();
  await new Customer(creditNoteCustomer).save();
  await new Service(creditNoteService).save();
  await CreditNote.insertMany(creditNotesList);
};

module.exports = {
  creditNotesList,
  populateDB,
  creditNoteCustomer,
  creditNoteEvent,
};
