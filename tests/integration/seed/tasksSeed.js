const { ObjectID } = require('mongodb');
const Task = require('../../../models/Task');
const { populateDBForAuthentification } = require('./authentificationSeed');

const tasksList = [
  {
    _id: new ObjectID(),
    name: 'Tâche qui tâche',
  },
  {
    _id: new ObjectID(),
    name: 'To do à faire',
  },
];

const populateDB = async () => {
  await Task.deleteMany({});

  await populateDBForAuthentification();
  await Task.insertMany(tasksList);
};

module.exports = {
  tasksList,
  populateDB,
};
