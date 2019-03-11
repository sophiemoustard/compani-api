const { ObjectID } = require('mongodb');

const Surcharge = require('../../../models/Surcharge');
const { companiesList } = require('./companiesSeed');

const surchargesList = [
  {
    _id: new ObjectID(),
    company: companiesList[0]._id,
    name: 'Chasse aux monstres hivernaux',
    saturday: 25,
    sunday: 20,
    publicHoliday: 12,
    twentyFifthOfDecember: 50,
    firstOfMay: 30,
    evening: 10,
    eveningStartTime: '20:00',
    eveningEndTime: '23:00',
    custom: 200,
    customStartTime: '13:59',
    customEndTime: '14:01',
  },
  {
    _id: new ObjectID(),
    company: companiesList[0]._id,
    name: 'Chasse aux monstres estivaux',
    saturday: 30,
    sunday: 25,
    publicHoliday: 14,
    twentyFifthOfDecember: 55,
    firstOfMay: 35,
    evening: 15,
    eveningStartTime: '21:00',
    eveningEndTime: '23:59',
    custom: '',
    customStartTime: '',
    customEndTime: '',
  },
];

const populateSurcharges = async () => {
  await Surcharge.remove({});
  await Surcharge.insertMany(surchargesList);
};

module.exports = { surchargesList, populateSurcharges };
