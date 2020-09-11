const sinon = require('sinon');
const { ObjectID } = require('mongodb');
const ActivityHistory = require('../../../src/models/ActivityHistory');
const ActivityHistoryHelper = require('../../../src/helpers/activityHistories');
require('sinon-mongoose');

describe('addActivityHistory', () => {
  let ActivityHistoryMock;

  beforeEach(() => {
    ActivityHistoryMock = sinon.mock(ActivityHistory);
  });

  afterEach(() => {
    ActivityHistoryMock.restore();
  });

  it('should create an activityHistory', async () => {
    const activityId = new ObjectID();
    const userId = new ObjectID();

    ActivityHistoryMock.expects('create').withExactArgs({ user: userId, activity: activityId });

    await ActivityHistoryHelper.addActivityHistory({ user: userId, activity: activityId });

    ActivityHistoryMock.verify();
  });
});
