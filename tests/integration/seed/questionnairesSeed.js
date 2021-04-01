const { ObjectID } = require('mongodb');
const Questionnaire = require('../../../src/models/Questionnaire');
const { populateDBForAuthentication } = require('./authenticationSeed');

const questionnairesList = [{ _id: new ObjectID(), title: 'test', status: 'draft', type: 'expectations' }];

const populateDB = async () => {
  await Questionnaire.deleteMany({});

  await populateDBForAuthentication();

  await Questionnaire.insertMany(questionnairesList);
};

module.exports = {
  populateDB,
  questionnairesList,
};
