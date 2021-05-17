const sinon = require('sinon');
const { ObjectID } = require('mongodb');
const eventTimeStampingHelper = require('../../../src/helpers/eventTimeStamping');
const eventHistoryHelper = require('../../../src/helpers/eventHistories');
const Event = require('../../../src/models/Event');

describe('addTimeStamp #tag', () => {
  let isTimeStampAllowedStub;
  let createTimeStampHistoryStub;
  let updateOne;

  beforeEach(() => {
    isTimeStampAllowedStub = sinon.stub(eventTimeStampingHelper, 'isTimeStampAllowed');
    createTimeStampHistoryStub = sinon.stub(eventHistoryHelper, 'createTimeStampHistory');
    updateOne = sinon.stub(Event, 'updateOne');
  });

  afterEach(() => {
    isTimeStampAllowedStub.restore();
    createTimeStampHistoryStub.restore();
    updateOne.restore();
  });

  it('should add timestamp and updateEvent', async () => {
    const event = { _id: new ObjectID() };
    const startDate = new Date();
    const payload = { action: 'manual_timestamping', reason: 'qrcode', startDate };

    isTimeStampAllowedStub.returns(true);

    await eventTimeStampingHelper.addTimeStamp(event, payload);

    sinon.assert.calledOnceWithExactly(isTimeStampAllowedStub, event, payload);
    sinon.assert.calledOnceWithExactly(createTimeStampHistoryStub, event, payload);
    sinon.assert.calledOnceWithExactly(updateOne, { _id: event._id }, { startDate });
  });

  it('should do nothing if timestamp is not allowed', async () => {
    const event = { _id: new ObjectID() };
    const startDate = new Date();
    const payload = { action: 'manual_timestamping', reason: 'qrcode', startDate };

    isTimeStampAllowedStub.returns(true);

    await eventTimeStampingHelper.addTimeStamp(event, payload);

    sinon.assert.calledOnceWithExactly(isTimeStampAllowedStub, event, payload);
    sinon.assert.calledOnceWithExactly(createTimeStampHistoryStub, event, payload);
    sinon.assert.calledOnceWithExactly(updateOne, { _id: event._id }, { startDate });
  });
});
