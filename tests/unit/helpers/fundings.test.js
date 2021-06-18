const expect = require('expect');
const { ObjectID } = require('mongodb');
const Boom = require('@hapi/boom');
const sinon = require('sinon');
const omit = require('lodash/omit');
const FundingsHelper = require('../../../src/helpers/fundings');
const Customer = require('../../../src/models/Customer');
const SinonMongoose = require('../sinonMongoose');

describe('checkSubscriptionFunding', () => {
  const checkedFundingSubscriptionId = new ObjectID();
  const fundingId = new ObjectID();
  const checkedFunding = {
    _id: fundingId.toHexString(),
    subscription: checkedFundingSubscriptionId.toHexString(),
    versions: [{ careDays: [0, 1, 2], startDate: '2019-10-01', endDate: '2019-11-02' }],
  };

  let findOneCustomer;
  beforeEach(() => {
    findOneCustomer = sinon.stub(Customer, 'findOne');
  });
  afterEach(() => {
    findOneCustomer.restore();
  });

  it('should return an error if customer does not exists', async () => {
    const customerId = new ObjectID();
    try {
      findOneCustomer.returns(SinonMongoose.stubChainedQueries([null], ['lean']));

      await FundingsHelper.checkSubscriptionFunding(customerId, checkedFunding);
    } catch (e) {
      expect(e).toEqual(Boom.notFound('Error while checking subscription funding: customer not found.'));
    } finally {
      SinonMongoose.calledWithExactly(
        findOneCustomer,
        [{ query: 'findOne', args: [{ _id: customerId }] }, { query: 'lean' }]
      );
    }
  });

  it('should return true if customer does not have fundings', async () => {
    const customerId = new ObjectID();

    findOneCustomer.returns(SinonMongoose.stubChainedQueries([{}], ['lean']));

    const res = await FundingsHelper.checkSubscriptionFunding(customerId, checkedFunding);

    expect(res).toBe(true);
    SinonMongoose.calledWithExactly(
      findOneCustomer,
      [{ query: 'findOne', args: [{ _id: customerId }] }, { query: 'lean' }]
    );
  });

  it('should return true if customer does not have fundings', async () => {
    const customerId = new ObjectID();

    findOneCustomer.returns(SinonMongoose.stubChainedQueries([{ fundings: [] }], ['lean']));

    const res = await FundingsHelper.checkSubscriptionFunding(customerId, checkedFunding);

    expect(res).toBe(true);
    SinonMongoose.calledWithExactly(
      findOneCustomer,
      [{ query: 'findOne', args: [{ _id: customerId }] }, { query: 'lean' }]
    );
  });

  it('should return true if the only fundings customer has is the one being updated', async () => {
    const customerId = new ObjectID();

    findOneCustomer.returns(SinonMongoose.stubChainedQueries(
      [{
        fundings: [{
          _id: fundingId,
          subscription: checkedFundingSubscriptionId,
          versions: [{ careDays: [0, 1, 2], startDate: '2019-10-01', endDate: '2019-11-02' }],
        }],
      }],
      ['lean']
    ));

    const res = await FundingsHelper.checkSubscriptionFunding(customerId, checkedFunding);

    expect(res).toBe(true);
    SinonMongoose.calledWithExactly(
      findOneCustomer,
      [{ query: 'findOne', args: [{ _id: customerId }] }, { query: 'lean' }]
    );
  });

  it('should return true if checkedFunding does not have careDays in common with the other funding', async () => {
    const customerId = new ObjectID();
    const fundings = [
      {
        _id: new ObjectID(),
        subscription: checkedFundingSubscriptionId,
        versions: [{ careDays: [4, 5], startDate: '2018-10-01', endDate: '2019-12-01' }],
      },
    ];

    findOneCustomer.returns(SinonMongoose.stubChainedQueries([{ fundings }], ['lean']));

    const res = await FundingsHelper.checkSubscriptionFunding(customerId, checkedFunding);

    expect(res).toBe(true);
    SinonMongoose.calledWithExactly(
      findOneCustomer,
      [{ query: 'findOne', args: [{ _id: customerId }] }, { query: 'lean' }]
    );
  });

  it('should return true if checkedFunding startDate is after the other funding endDate', async () => {
    const customerId = new ObjectID();
    const fundings = [
      {
        _id: new ObjectID(),
        subscription: checkedFundingSubscriptionId,
        versions: [{ careDays: [0, 1, 2, 3], startDate: '2018-10-01', endDate: '2018-12-01' }],
      },
    ];

    findOneCustomer.returns(SinonMongoose.stubChainedQueries([{ fundings }], ['lean']));

    const res = await FundingsHelper.checkSubscriptionFunding(customerId, checkedFunding);

    expect(res).toBe(true);
    SinonMongoose.calledWithExactly(
      findOneCustomer,
      [{ query: 'findOne', args: [{ _id: customerId }] }, { query: 'lean' }]
    );
  });

  it('should return true if checkedFunding endDate is before the other funding startDate', async () => {
    const customerId = new ObjectID();
    const fundings = [
      {
        _id: new ObjectID(),
        subscription: checkedFundingSubscriptionId,
        versions: [{ careDays: [0, 1, 2, 3], startDate: '2019-11-03', endDate: '2019-12-01' }],
      },
    ];

    findOneCustomer.returns(SinonMongoose.stubChainedQueries([{ fundings }], ['lean']));

    const res = await FundingsHelper.checkSubscriptionFunding(customerId, checkedFunding);

    expect(res).toBe(true);
    SinonMongoose.calledWithExactly(
      findOneCustomer,
      [{ query: 'findOne', args: [{ _id: customerId }] }, { query: 'lean' }]
    );
  });

  it('should return true if checkedFunding and other fundings are not for the same subscription', async () => {
    const customerId = new ObjectID();
    const fundings = [
      {
        _id: new ObjectID(),
        subscription: new ObjectID(),
        versions: [{ careDays: [0, 1, 2, 3], startDate: '2018-11-03', endDate: '2019-10-22' }],
      },
    ];

    findOneCustomer.returns(SinonMongoose.stubChainedQueries([{ fundings }], ['lean']));

    const res = await FundingsHelper.checkSubscriptionFunding(customerId, checkedFunding);

    expect(res).toBe(true);
    SinonMongoose.calledWithExactly(
      findOneCustomer,
      [{ query: 'findOne', args: [{ _id: customerId }] }, { query: 'lean' }]
    );
  });

  it('should return false if checkedFunding has careDays in common with other fundings on same period', async () => {
    const customerId = new ObjectID();
    const fundings = [
      {
        _id: new ObjectID(),
        subscription: checkedFundingSubscriptionId,
        versions: [{ careDays: [0, 1, 2, 3], startDate: '2018-11-03', endDate: '2019-10-22' }],
      },
    ];

    findOneCustomer.returns(SinonMongoose.stubChainedQueries([{ fundings }], ['lean']));

    const res = await FundingsHelper.checkSubscriptionFunding(customerId, checkedFunding);

    expect(res).toBe(false);
    SinonMongoose.calledWithExactly(
      findOneCustomer,
      [{ query: 'findOne', args: [{ _id: customerId }] }, { query: 'lean' }]
    );
  });

  it('should return false if one of the fundings have a conflict with checked fundings', async () => {
    const customerId = new ObjectID();
    const fundings = [
      {
        _id: new ObjectID(),
        subscription: checkedFundingSubscriptionId,
        versions: [{ careDays: [0, 1, 2, 3], startDate: '2018-11-03', endDate: '2019-10-22' }],
      },
      {
        _id: new ObjectID(),
        subscription: checkedFundingSubscriptionId,
        versions: [{ careDays: [0, 1, 2, 3], startDate: '2018-10-01', endDate: '2018-12-01' }],
      },
    ];

    findOneCustomer.returns(SinonMongoose.stubChainedQueries([{ fundings }], ['lean']));

    const res = await FundingsHelper.checkSubscriptionFunding(customerId, checkedFunding);

    expect(res).toBe(false);
    SinonMongoose.calledWithExactly(
      findOneCustomer,
      [{ query: 'findOne', args: [{ _id: customerId }] }, { query: 'lean' }]
    );
  });
});

describe('createFunding', () => {
  let checkSubscriptionFunding;
  let findOneAndUpdateCustomer;
  let populateFundingsList;
  beforeEach(() => {
    checkSubscriptionFunding = sinon.stub(FundingsHelper, 'checkSubscriptionFunding');
    findOneAndUpdateCustomer = sinon.stub(Customer, 'findOneAndUpdate');
    populateFundingsList = sinon.stub(FundingsHelper, 'populateFundingsList');
  });
  afterEach(() => {
    checkSubscriptionFunding.restore();
    findOneAndUpdateCustomer.restore();
    populateFundingsList.restore();
  });

  it('should create funding if no conflict', async () => {
    const customerId = 'qwertyuiop';
    const payload = { subscription: '1234567890' };
    const customer = { _id: customerId };

    checkSubscriptionFunding.returns(true);
    findOneAndUpdateCustomer.returns(SinonMongoose.stubChainedQueries([customer]));

    await FundingsHelper.createFunding(customerId, payload);

    sinon.assert.calledWithExactly(checkSubscriptionFunding, customerId, payload);
    sinon.assert.calledWithExactly(populateFundingsList, customer);
    SinonMongoose.calledWithExactly(
      findOneAndUpdateCustomer,
      [
        {
          query: 'findOneAndUpdate',
          args: [
            { _id: customerId },
            { $push: { fundings: payload } },
            { new: true, select: { identity: 1, fundings: 1, subscriptions: 1 }, autopopulate: false },
          ],
        },
        { query: 'populate', args: [{ path: 'subscriptions.service' }] },
        { query: 'populate', args: [{ path: 'fundings.thirdPartyPayer' }] },
        { query: 'lean' },
      ]
    );
  });

  it('should throw an error if conflict', async () => {
    const customerId = 'qwertyuiop';
    const payload = { subscription: '1234567890' };

    try {
      checkSubscriptionFunding.returns(false);
      await FundingsHelper.createFunding(customerId, payload);
    } catch (e) {
      expect(e.output.statusCode).toEqual(409);
    } finally {
      sinon.assert.calledWithExactly(checkSubscriptionFunding, customerId, payload);
      sinon.assert.notCalled(populateFundingsList);
      sinon.assert.notCalled(findOneAndUpdateCustomer);
    }
  });
});

describe('updateFunding', () => {
  let checkSubscriptionFunding;
  let findOneAndUpdateCustomer;
  let populateFundingsList;
  beforeEach(() => {
    checkSubscriptionFunding = sinon.stub(FundingsHelper, 'checkSubscriptionFunding');
    findOneAndUpdateCustomer = sinon.stub(Customer, 'findOneAndUpdate');
    populateFundingsList = sinon.stub(FundingsHelper, 'populateFundingsList');
  });
  afterEach(() => {
    checkSubscriptionFunding.restore();
    findOneAndUpdateCustomer.restore();
    populateFundingsList.restore();
  });

  it('should update funding if no conflict and has fundinPlanId', async () => {
    const customerId = 'qwertyuiop';
    const fundingId = 'mnbvcxz';
    const payload = { subscription: '1234567890', fundingPlanId: '12345' };
    const customer = { _id: customerId };
    const checkPayload = { _id: fundingId, subscription: '1234567890', versions: [{ subscription: '1234567890' }] };

    checkSubscriptionFunding.returns(true);
    findOneAndUpdateCustomer.returns(SinonMongoose.stubChainedQueries([customer]));

    await FundingsHelper.updateFunding(customerId, fundingId, payload);

    sinon.assert.calledWithExactly(checkSubscriptionFunding, customerId, checkPayload);
    sinon.assert.calledWithExactly(populateFundingsList, customer);
    SinonMongoose.calledWithExactly(
      findOneAndUpdateCustomer,
      [
        {
          query: 'findOneAndUpdate',
          args: [
            { _id: customerId, 'fundings._id': fundingId },
            {
              $set: { 'fundings.$.fundingPlanId': payload.fundingPlanId },
              $push: { 'fundings.$.versions': omit(payload, 'fundingPlanId') },
            },
            { new: true, select: { identity: 1, fundings: 1, subscriptions: 1 }, autopopulate: false },
          ],
        },
        { query: 'populate', args: [{ path: 'subscriptions.service' }] },
        { query: 'populate', args: [{ path: 'fundings.thirdPartyPayer' }] },
        { query: 'lean' },
      ]
    );
  });

  it('should update funding if no conflict and has no fundinPlanId', async () => {
    const customerId = 'qwertyuiop';
    const fundingId = 'mnbvcxz';
    const payload = { subscription: '1234567890' };
    const customer = { _id: customerId };
    const checkPayload = { _id: fundingId, subscription: '1234567890', versions: [{ subscription: '1234567890' }] };

    checkSubscriptionFunding.returns(true);
    findOneAndUpdateCustomer.returns(SinonMongoose.stubChainedQueries([customer]));

    await FundingsHelper.updateFunding(customerId, fundingId, payload);

    sinon.assert.calledWithExactly(checkSubscriptionFunding, customerId, checkPayload);
    sinon.assert.calledWithExactly(populateFundingsList, customer);
    SinonMongoose.calledWithExactly(
      findOneAndUpdateCustomer,
      [
        {
          query: 'findOneAndUpdate',
          args: [
            { _id: customerId, 'fundings._id': fundingId },
            { $push: { 'fundings.$.versions': payload } },
            { new: true, select: { identity: 1, fundings: 1, subscriptions: 1 }, autopopulate: false },
          ],
        },
        { query: 'populate', args: [{ path: 'subscriptions.service' }] },
        { query: 'populate', args: [{ path: 'fundings.thirdPartyPayer' }] },
        { query: 'lean' },
      ]
    );
  });

  it('should throw an error if conflict', async () => {
    const customerId = 'qwertyuiop';
    const fundingId = 'mnbvcxz';
    const payload = { subscription: '1234567890' };
    const checkPayload = { _id: fundingId, subscription: '1234567890', versions: [{ subscription: '1234567890' }] };

    try {
      checkSubscriptionFunding.returns(false);
      await FundingsHelper.updateFunding(customerId, fundingId, payload);
    } catch (e) {
      expect(e.output.statusCode).toEqual(409);
    } finally {
      sinon.assert.calledWithExactly(checkSubscriptionFunding, customerId, checkPayload);
      sinon.assert.notCalled(populateFundingsList);
      sinon.assert.notCalled(findOneAndUpdateCustomer);
    }
  });
});

describe('deleteFunding', () => {
  let updateOne;
  beforeEach(() => {
    updateOne = sinon.stub(Customer, 'updateOne');
  });
  afterEach(() => {
    updateOne.restore();
  });

  it('should delete funding', async () => {
    await FundingsHelper.deleteFunding('1234567890', 'asdfghjkl');
    sinon.assert.calledWithExactly(
      updateOne,
      { _id: '1234567890' },
      { $pull: { fundings: { _id: 'asdfghjkl' } } }
    );
  });
});
