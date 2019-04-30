const { ObjectID } = require('mongodb');
const sinon = require('sinon');
const FundingHistory = require('../../../models/FundingHistory');
const Event = require('../../../models/Event');
const { updateEventAndFundingHistory } = require('../../../helpers/creditNotes');

describe('updateEventAndFundingHistory', () => {
  let findOneAndUpdate = null;
  let find = null;
  let save = null;
  beforeEach(() => {
    findOneAndUpdate = sinon.stub(FundingHistory, 'findOneAndUpdate');
    find = sinon.stub(Event, 'find');
    save = sinon.stub(Event.prototype, 'save');
  });
  afterEach(() => {
    findOneAndUpdate.restore();
    find.restore();
    save.restore();
  });

  it('should increment history for hourly and once funding', async () => {
    const fundingVersionId = new ObjectID();
    const events = [
      new Event({
        bills: { nature: 'hourly', fundingVersion: fundingVersionId, thirdPartyPayer: new ObjectID(), careHours: 3 },
        startDate: new Date('2019/01/19')
      }),
    ];

    find.returns(events);
    findOneAndUpdate.returns(null);

    await updateEventAndFundingHistory([], false);
    sinon.assert.callCount(findOneAndUpdate, 2);
    sinon.assert.calledWith(
      findOneAndUpdate.firstCall,
      { fundingVersion: fundingVersionId, month: '01/2019' },
      { $inc: { careHours: -3 } }
    );
    sinon.assert.calledWith(
      findOneAndUpdate.secondCall,
      { fundingVersion: fundingVersionId },
      { $inc: { careHours: -3 } }
    );
  });

  it('should increment history for hourly and monthly funding', async () => {
    const fundingVersionId = new ObjectID();
    const events = [
      new Event({
        bills: { nature: 'hourly', fundingVersion: fundingVersionId, thirdPartyPayer: new ObjectID(), careHours: 3 },
        startDate: new Date('2019/01/19')
      }),
    ];

    find.returns(events);
    findOneAndUpdate.returns(new FundingHistory());

    await updateEventAndFundingHistory([], false);
    sinon.assert.callCount(findOneAndUpdate, 1);
    sinon.assert.calledWith(
      findOneAndUpdate,
      { fundingVersion: fundingVersionId, month: '01/2019' },
      { $inc: { careHours: -3 } }
    );
  });

  it('should decrement history for hourly and monthly funding', async () => {
    const fundingVersionId = new ObjectID();
    const events = [
      new Event({
        bills: { nature: 'hourly', fundingVersion: fundingVersionId, thirdPartyPayer: new ObjectID(), careHours: 3 },
        startDate: new Date('2019/01/19')
      }),
    ];

    find.returns(events);
    findOneAndUpdate.returns(null);

    await updateEventAndFundingHistory([], true);
    sinon.assert.callCount(findOneAndUpdate, 2);
    sinon.assert.calledWith(
      findOneAndUpdate.firstCall,
      { fundingVersion: fundingVersionId, month: '01/2019' },
      { $inc: { careHours: 3 } }
    );
  });

  it('should increment history for fixed and once funding', async () => {
    const fundingVersionId = new ObjectID();
    const events = [
      new Event({
        bills: { nature: 'fixed', fundingVersion: fundingVersionId, thirdPartyPayer: new ObjectID(), inclTaxesTpp: 666 },
        startDate: new Date('2019/01/19')
      }),
    ];

    find.returns(events);
    findOneAndUpdate.returns(new FundingHistory());

    await updateEventAndFundingHistory([], false);
    sinon.assert.callCount(findOneAndUpdate, 1);
    sinon.assert.calledWith(
      findOneAndUpdate,
      { fundingVersion: fundingVersionId },
      { $inc: { amountTTC: -666 } }
    );
  });
});
