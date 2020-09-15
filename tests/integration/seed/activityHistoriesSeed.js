const { ObjectID } = require('mongodb');
const Activity = require('../../../src/models/Activity');
const Step = require('../../../src/models/Step');
const SubProgram = require('../../../src/models/SubProgram');
const Course = require('../../../src/models/Course');
const { populateDBForAuthentication } = require('./authenticationSeed');
const { userList } = require('../../seed/userSeed');

const activityHistoriesUsersList = [userList[6]._id, userList[5]._id];

const activitiesList = [
  { _id: new ObjectID(), name: 'bouger', type: 'lesson' },
];

const stepsList = [{
  _id: new ObjectID(),
  type: 'on_site',
  name: 'c\'est une étape',
  activities: [activitiesList[0]._id],
}];

const subProgramsList = [
  { _id: new ObjectID(), name: 'sous-programme A', steps: [stepsList[0]._id] },
];

const coursesList = [
  {
    _id: new ObjectID(),
    subProgram: subProgramsList[0]._id,
    company: new ObjectID(),
    misc: 'first session',
    type: 'intra',
    trainer: new ObjectID(),
    trainees: [userList[6]._id],
  }];

const populateDB = async () => {
  await Activity.deleteMany({});
  await Step.deleteMany({});
  await SubProgram.deleteMany({});
  await Course.deleteMany({});

  await populateDBForAuthentication();

  await Activity.insertMany(activitiesList);
  await Step.insertMany(stepsList);
  await SubProgram.insertMany(subProgramsList);
  await Course.insertMany(coursesList);
};

module.exports = {
  populateDB,
  activitiesList,
  stepsList,
  subProgramsList,
  coursesList,
  activityHistoriesUsersList,
};
