const sinon = require('sinon');
const { ObjectID } = require('mongodb');
const ActivityHistory = require('../../../src/models/ActivityHistory');
const ActivityHistoryHelper = require('../../../src/helpers/activityHistories');

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
    const questionnaireAnswers = [{ card: new ObjectID(), answer: 'blabla' }];

    await ActivityHistoryHelper.addActivityHistory({ user: userId, activity: activityId, questionnaireAnswers });

    sinon.assert.calledOnceWithExactly(
      create,
      { user: userId, activity: activityId, questionnaireAnswers }
    );
  });
});
