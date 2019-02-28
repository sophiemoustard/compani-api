const { ObjectID } = require('mongodb');

const { companiesList } = require('./companiesSeed');
const Sector = require('../../../models/Sector');

const sectorsList = [
  {
    _id: new ObjectID(),
    name: 'Test',
    companyId: companiesList[0]._id,
  },
  {
    _id: new ObjectID(),
    name: 'Test2',
    companyId: companiesList[0]._id,
  },
];


const populateSectors = async () => {
  await Sector.remove({});
  await Sector.insertMany(sectorsList);
};


module.exports = { sectorsList, populateSectors };
