const { ObjectID } = require('mongodb');
const User = require('../../../src/models/User');
const Customer = require('../../../src/models/Customer');
const Sector = require('../../../src/models/Sector');
const EventHistory = require('../../../src/models/EventHistory');
const { populateDBForAuthentification, rolesList } = require('./authentificationSeed');

const user = {
  _id: new ObjectID(),
  identity: { firstname: 'Bob', lastname: 'Marley' },
  local: { email: 'lala@alenvi.io', password: '123456' },
  role: rolesList[1]._id,
};

const eventHistoryAuxiliary = {
  _id: new ObjectID(),
  identity: { firstname: 'Mimi', lastname: 'Mita' },
  local: { email: 'lili@alenvi.io', password: '123456' },
  role: rolesList[2]._id,
};

const sector = {
  _id: new ObjectID(),
};

const customer = {
  _id: new ObjectID(),
  identity: { firstname: 'Julian', lastname: 'Alaphilippe' },
};

const eventHistoryList = [
  {
    _id: ObjectID(),
    action: 'event_creation',
    createdBy: user._id,
    sectors: [sector._id],
    auxiliaries: [eventHistoryAuxiliary._id],
    event: {
      type: 'intervention',
      startDate: '2019-01-20T09:38:18',
      endDate: '2019-01-20T11:38:18',
      customer: customer._id,
      auxiliary: eventHistoryAuxiliary._id,
    },
  },
  {
    _id: ObjectID(),
    action: 'event_deletion',
    createdBy: user._id,
    sectors: [sector._id],
    auxiliaries: [eventHistoryAuxiliary._id],
    event: {
      type: 'internalHour',
      startDate: '2019-01-20T09:38:18',
      endDate: '2019-01-20T11:38:18',
      internalHour: {
        name: 'Réunion',
        _id: new ObjectID(),
      },
      auxiliary: eventHistoryAuxiliary._id,
      misc: 'Je suis une note',
    },
  },
  {
    _id: ObjectID(),
    action: 'event_update',
    createdBy: user._id,
    sectors: [sector._id],
    auxiliaries: [eventHistoryAuxiliary._id],
    event: {
      type: 'absence',
      startDate: '2019-01-20T09:38:18',
      endDate: '2019-01-20T11:38:18',
      absence: 'leave',
      auxiliary: eventHistoryAuxiliary._id,
      misc: 'Je suis une note',
    },
  },
];

const populateDB = async () => {
  await Customer.deleteMany({});
  await User.deleteMany({});
  await Sector.deleteMany({});
  await EventHistory.deleteMany({});

  await populateDBForAuthentification();

  await EventHistory.insertMany(eventHistoryList);
  await (new User(user)).save();
  await (new User(eventHistoryAuxiliary)).save();
  await (new Customer(customer)).save();
  await (new Sector(sector)).save();
};

module.exports = {
  populateDB,
  eventHistoryList,
  eventHistoryAuxiliary,
};
