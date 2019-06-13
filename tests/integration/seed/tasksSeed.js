const { ObjectID } = require('mongodb');
const Task = require('../../../models/Task');

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

const populateTasks = async () => {
  await Task.deleteMany({});
  await Task.insertMany(tasksList);
};

module.exports = {
  populateTasks,
  tasksList,
};
