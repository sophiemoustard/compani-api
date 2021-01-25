const sinon = require('sinon');
const expect = require('expect');
const { ObjectID } = require('mongodb');
const ActivityHistory = require('../../../src/models/ActivityHistory');
const User = require('../../../src/models/User');
const ActivityHistoryHelper = require('../../../src/helpers/activityHistories');
const SinonMongoose = require('../sinonMongoose');

describe('addActivityHistory', () => {
  let create;

  beforeEach(() => {
    create = sinon.stub(ActivityHistory, 'create');
  });

  afterEach(() => {
    create.restore();
  });

  it('should create an activityHistory', async () => {
    const activityId = new ObjectID();
    const userId = new ObjectID();
    const questionnaireAnswersList = [{ card: new ObjectID(), answerList: ['blabla'] }];

    await ActivityHistoryHelper.addActivityHistory({ user: userId, activity: activityId, questionnaireAnswersList });

    sinon.assert.calledOnceWithExactly(
      create,
      { user: userId, activity: activityId, questionnaireAnswersList }
    );
  });
});

describe('list', () => {
  let findUsers;
  let findHistories;
  beforeEach(() => {
    findHistories = sinon.stub(ActivityHistory, 'find');
    findUsers = sinon.stub(User, 'find');
  });
  afterEach(() => {
    findHistories.restore();
    findUsers.restore();
  });

  it('should return a list of histories', async () => {
    const companyId = new ObjectID();
    const query = { startDate: '2020-12-10T23:00:00', endDate: '2021-01-10T23:00:00' };
    const firstUserId = new ObjectID();
    const secondUserId = new ObjectID();
    const activityHistories = [
      {
        user: firstUserId,
        activity: {
          steps: [{
            subProgram: {
              program: { name: 'une incroyable découverte' },
              courses: [{
                misc: 'groupe 1',
                format: 'strictly_e_learning',
                trainees: [firstUserId],
              }],
            },
          }],
        },
      },
      {
        user: secondUserId,
        activity: {
          steps: [{
            subProgram: {
              program: { name: 'une rencontre sensationnelle' },
              courses: [{
                misc: 'groupe 2',
                format: 'strictly_e_learning',
                trainees: [new ObjectID()],
              }],
            },
          }],
        },
      }];
    const filteredActivityHistories = {
      user: firstUserId,
      activity: {
        steps: [{
          subProgram: {
            program: { name: 'une incroyable découverte' },
            courses: [{
              misc: 'groupe 1',
              format: 'strictly_e_learning',
              trainees: [firstUserId],
            }],
          },
        }],
      },
    };

    findUsers.returns(SinonMongoose.stubChainedQueries([[{ _id: firstUserId }, { _id: secondUserId }]], ['lean']));
    findHistories.returns(SinonMongoose.stubChainedQueries([activityHistories]));

    const result = await ActivityHistoryHelper.list(query, { company: { _id: companyId } });

    expect(result).toEqual([filteredActivityHistories]);
    SinonMongoose.calledWithExactly(
      findUsers,
      [{ query: 'find', args: [{ company: companyId }, { _id: 1 }] }, { query: 'lean' }]
    );
    SinonMongoose.calledWithExactly(
      findHistories,
      [
        {
          query: 'find',
          args: [{
            date: { $lte: new Date('2021-01-10T23:00:00'), $gte: new Date('2020-12-10T23:00:00') },
            user: { $in: [firstUserId, secondUserId] },
          }],
        },
        {
          query: 'populate',
          args: [{
            path: 'activity',
            select: '_id',
            populate: {
              path: 'steps',
              select: '_id',
              populate: {
                path: 'subProgram',
                select: '_id',
                populate: [
                  { path: 'courses', select: 'misc format trainees', match: { format: 'strictly_e_learning' } },
                  { path: 'program', select: 'name' }],
              },
            },
          }],
        },
        { query: 'populate', args: [{ path: 'user', select: '_id identity picture' }] },
        { query: 'lean' },
      ]
    );
  });
});
