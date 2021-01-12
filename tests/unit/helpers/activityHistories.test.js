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

    findUsers.returns(SinonMongoose.stubChainedQueries([[{ _id: 1 }, { _id: 2 }, { _id: 3 }]], ['lean']));
    findHistories.returns(SinonMongoose.stubChainedQueries([[{ user: 1 }, { user: 2 }, { user: 3 }]], ['lean']));

    const result = await ActivityHistoryHelper.list(query, { company: { _id: companyId } });

    expect(result).toEqual([{ user: 1 }, { user: 2 }, { user: 3 }]);
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
            user: { $in: [1, 2, 3] },
          }],
        },
        { query: 'lean' },
      ]
    );
  });
});
