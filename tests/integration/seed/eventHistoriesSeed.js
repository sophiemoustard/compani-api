const { ObjectId } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const User = require('../../../src/models/User');
const Customer = require('../../../src/models/Customer');
const Sector = require('../../../src/models/Sector');
const EventHistory = require('../../../src/models/EventHistory');
const Event = require('../../../src/models/Event');
const UserCompany = require('../../../src/models/UserCompany');
const {
  INTERNAL_HOUR,
  INTERVENTION,
  ABSENCE,
  PAID_LEAVE,
  EVENT_UPDATE,
  EVENT_DELETION,
  EVENT_CREATION,
  WEBAPP,
  QR_CODE_TIME_STAMPING,
} = require('../../../src/helpers/constants');
const { authCompany, otherCompany, companyWithoutSubscription } = require('../../seed/authCompaniesSeed');
const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');
const { coachRoleId, clientAdminRoleId } = require('../../seed/authRolesSeed');

const users = [
  {
    _id: new ObjectId(),
    identity: { firstname: 'Mimi', lastname: 'Mita' },
    local: { email: 'lili@alenvi.io' },
    role: { client: coachRoleId },
    refreshToken: uuidv4(),
    origin: WEBAPP,
  },
  {
    _id: new ObjectId(),
    identity: { firstname: 'Joséphine', lastname: 'Mita' },
    local: { email: 'lili2@alenvi.io' },
    role: { client: coachRoleId },
    refreshToken: uuidv4(),
    origin: WEBAPP,
  },
  {
    _id: new ObjectId(),
    identity: { firstname: 'Bob', lastname: 'Marley' },
    local: { email: 'lala@alenvi.io' },
    role: { client: clientAdminRoleId },
    refreshToken: uuidv4(),
    origin: WEBAPP,
  },
  {
    _id: new ObjectId(),
    identity: { firstname: 'test', lastname: 'Mita' },
    local: { email: 'otherCompany@alenvi.io' },
    role: { client: coachRoleId },
    refreshToken: uuidv4(),
    origin: WEBAPP,
  },
];

const auxiliaries = [users[0], users[1]];
const auxiliaryFromOtherCompany = users[3];

const userCompanies = [
  // old inactive user company
  {
    user: users[0],
    company: companyWithoutSubscription._id,
    startDate: '2022-01-01T23:00:00.000Z',
    endDate: '2022-11-30T23:00:00.000Z',
  },
  { user: users[0], company: authCompany._id },
  { user: users[1], company: authCompany._id },
  { user: users[2], company: authCompany._id },
  { user: users[3], company: otherCompany._id },
];

const sectors = [{ _id: new ObjectId(), company: authCompany._id }, { _id: new ObjectId(), company: authCompany._id }];

const sectorFromOtherCompany = { _id: new ObjectId(), company: otherCompany._id };

const customer = {
  _id: new ObjectId(),
  company: authCompany._id,
  identity: { firstname: 'Julian', lastname: 'Alaphilippe' },
  contact: {
    primaryAddress: {
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
      street: '37 rue de Ponthieu',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
    phone: '0612345678',
  },
};

const events = [
  {
    _id: new ObjectId(),
    company: authCompany._id,
    type: INTERVENTION,
    startDate: '2019-01-20T09:38:18',
    endDate: '2019-01-20T11:38:18',
    customer: customer._id,
    auxiliary: auxiliaries[0]._id,
    address: {
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
      street: '37 rue de Ponthieu',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
    subscription: new ObjectId(),
    isBilled: false,
  },
  { // 1
    _id: new ObjectId(),
    company: authCompany._id,
    type: INTERNAL_HOUR,
    startDate: '2019-01-20T09:38:18',
    endDate: '2019-01-20T11:38:18',
    internalHour: { name: 'Réunion', _id: new ObjectId() },
    auxiliary: auxiliaries[0]._id,
    misc: 'Je suis une note',
  },
  { // 2
    _id: new ObjectId(),
    company: authCompany._id,
    type: ABSENCE,
    absenceNature: 'daily',
    startDate: '2019-01-20T09:38:18',
    endDate: '2019-01-20T11:38:18',
    absence: PAID_LEAVE,
    auxiliary: auxiliaries[0]._id,
    misc: 'Je suis une note',
  },
  { // billed - 3
    _id: new ObjectId(),
    company: authCompany._id,
    type: INTERVENTION,
    startDate: '2019-01-20T09:38:18',
    endDate: '2019-01-20T11:38:18',
    customer: customer._id,
    auxiliary: auxiliaries[0]._id,
    subscription: new ObjectId(),
    address: {
      fullAddress: '37 rue de ponthieu 75008 Paris',
      zipCode: '75008',
      city: 'Paris',
      street: '37 rue de Ponthieu',
      location: { type: 'Point', coordinates: [2.377133, 48.801389] },
    },
    isBilled: true,
  },
];

const eventHistoryList = [
  {
    _id: ObjectId(),
    company: authCompany._id,
    action: EVENT_CREATION,
    createdBy: users[2]._id,
    sectors: [sectors[0]._id],
    auxiliaries: [auxiliaries[0]._id],
    event: {
      eventId: events[0]._id,
      type: INTERVENTION,
      startDate: '2019-01-20T09:38:18',
      endDate: '2019-01-20T11:38:18',
      customer: customer._id,
      auxiliary: auxiliaries[0]._id,
    },
  },
  { // 1
    _id: ObjectId(),
    company: authCompany._id,
    action: EVENT_DELETION,
    createdBy: users[2]._id,
    sectors: [sectors[0]._id],
    auxiliaries: [auxiliaries[0]._id],
    event: {
      eventId: events[1]._id,
      type: INTERNAL_HOUR,
      startDate: '2019-01-20T09:38:18',
      endDate: '2019-01-20T11:38:18',
      internalHour: { name: 'Réunion', _id: new ObjectId() },
      auxiliary: auxiliaries[0]._id,
      misc: 'Je suis une note',
    },
  },
  { // 2
    _id: ObjectId(),
    company: authCompany._id,
    action: EVENT_UPDATE,
    createdBy: users[2]._id,
    sectors: [sectors[0]._id],
    auxiliaries: [auxiliaries[0]._id],
    event: {
      eventId: events[2]._id,
      type: ABSENCE,
      startDate: '2019-01-20T09:38:18',
      endDate: '2019-01-20T11:38:18',
      absence: PAID_LEAVE,
      auxiliary: auxiliaries[0]._id,
      misc: 'Je suis une note',
    },
  },
  { // time stamping - 3
    _id: ObjectId(),
    company: authCompany._id,
    action: QR_CODE_TIME_STAMPING,
    createdBy: users[2]._id,
    sectors: [sectors[0]._id],
    auxiliaries: [auxiliaries[0]._id],
    event: {
      eventId: events[0]._id,
      type: INTERVENTION,
      startDate: '2021-01-20T09:38:18',
      endDate: '2021-01-20T11:38:18',
      customer: customer._id,
      auxiliary: auxiliaries[0]._id,
    },
    isCancelled: false,
  },
  { // time stamping cancelled - 4
    _id: ObjectId(),
    company: authCompany._id,
    action: QR_CODE_TIME_STAMPING,
    createdBy: users[2]._id,
    sectors: [sectors[0]._id],
    auxiliaries: [auxiliaries[0]._id],
    event: {
      eventId: events[0]._id,
      type: INTERVENTION,
      startDate: '2021-01-20T09:38:18',
      endDate: '2021-01-20T11:38:18',
      customer: customer._id,
      auxiliary: auxiliaries[0]._id,
    },
    isCancelled: true,
  },
  { // time stamping from other company - 5
    _id: ObjectId(),
    company: otherCompany._id,
    action: QR_CODE_TIME_STAMPING,
    createdBy: users[2]._id,
    sectors: [sectors[0]._id],
    auxiliaries: [auxiliaries[0]._id],
    event: {
      eventId: events[0]._id,
      type: INTERVENTION,
      startDate: '2021-01-20T09:38:18',
      endDate: '2021-01-20T11:38:18',
      customer: customer._id,
      auxiliary: auxiliaries[0]._id,
    },
    isCancelled: false,
  },
  { // billed event - 6
    _id: ObjectId(),
    company: authCompany._id,
    action: QR_CODE_TIME_STAMPING,
    createdBy: users[2]._id,
    sectors: [sectors[0]._id],
    auxiliaries: [auxiliaries[0]._id],
    event: {
      eventId: events[3]._id,
      type: INTERVENTION,
      startDate: '2019-01-20T09:38:18',
      endDate: '2019-01-20T11:38:18',
      customer: customer._id,
      auxiliary: auxiliaries[0]._id,
    },
    isCancelled: false,
  },
];

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();

  await Promise.all([
    Customer.create(customer),
    Event.create(events),
    EventHistory.create(eventHistoryList),
    Sector.create([...sectors, sectorFromOtherCompany]),
    UserCompany.create(userCompanies),
    User.create(users),
  ]);
};

module.exports = {
  populateDB,
  eventHistoryList,
  auxiliaries,
  auxiliaryFromOtherCompany,
  sectorFromOtherCompany,
  sectors,
  events,
};
