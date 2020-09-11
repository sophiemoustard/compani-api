const sinon = require('sinon');
const { ObjectID } = require('mongodb');
const ActivityHistoryHelper = require('../../../src/helpers/activityHistories');

describe('addActivityHistory', () => {
  let addActivityHistoryStub;

  beforeEach(() => {
    addActivityHistoryStub = sinon.stub(ActivityHistoryHelper, 'addActivityHistory');
  });

  afterEach(() => {
    addActivityHistoryStub.restore();
  });

  it('should create an activityHistory', async () => {
    const activityId = new ObjectID();
    const userId = new ObjectID();

    await ActivityHistoryHelper.addActivityHistory({ user: userId, activity: activityId });

    sinon.assert.calledOnce(addActivityHistoryStub);
    sinon.assert.calledWithExactly(addActivityHistoryStub, { user: userId, activity: activityId });
  });
});
