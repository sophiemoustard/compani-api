const expect = require('expect');
const { ObjectID } = require('mongodb');
const Boom = require('@hapi/boom');
const sinon = require('sinon');
const FundingsHelper = require('../../../src/helpers/fundings');
const Customer = require('../../../src/models/Customer');

require('sinon-mongoose');

describe('checkSubscriptionFunding', () => {
  const checkedFundingSubscriptionId = new ObjectID();
  const fundingId = new ObjectID();
  const checkedFunding = {
    _id: fundingId.toHexString(),
    subscription: checkedFundingSubscriptionId.toHexString(),
    versions: [{
      careDays: [0, 1, 2],
      startDate: '2019-10-01',
      endDate: '2019-11-02',
    }],
  };

  let CustomerModel;
  beforeEach(() => {
    CustomerModel = sinon.mock(Customer);
  });
  afterEach(() => {
    CustomerModel.restore();
  });

  it('should return an error if customer does not exists', async () => {
    try {
      const customerId = new ObjectID();
      CustomerModel.expects('findOne')
        .withExactArgs({ _id: customerId })
        .chain('lean')
        .once()
        .returns(null);

      await FundingsHelper.checkSubscriptionFunding(customerId, checkedFunding);
    } catch (e) {
      expect(e).toEqual(Boom.notFound('Error while checking subscription funding: customer not found.'));
    } finally {
      CustomerModel.verify();
    }
  });

  it('should return true if customer does not have fundings', async () => {
    const customerId = new ObjectID();
    CustomerModel.expects('findOne')
      .withExactArgs({ _id: customerId })
      .chain('lean')
      .once()
      .returns({});

    const res = await FundingsHelper.checkSubscriptionFunding(customerId, checkedFunding);

    expect(res).toBe(true);
    CustomerModel.verify();
  });

  it('should return true if customer does not have fundings', async () => {
    const customerId = new ObjectID();
    CustomerModel.expects('findOne')
      .withExactArgs({ _id: customerId })
      .chain('lean')
      .once()
      .returns({ fundings: [] });

    const res = await FundingsHelper.checkSubscriptionFunding(customerId, checkedFunding);

    expect(res).toBe(true);
    CustomerModel.verify();
  });

  it('should return true if the only fundings customer has is the one being updated', async () => {
    const customerId = new ObjectID();
    CustomerModel.expects('findOne')
      .withExactArgs({ _id: customerId })
      .chain('lean')
      .once()
      .returns({
        fundings: [{
          _id: fundingId,
          subscription: checkedFundingSubscriptionId,
          versions: [{
            careDays: [0, 1, 2],
            startDate: '2019-10-01',
            endDate: '2019-11-02',
          }],
        }],
      });

    const res = await FundingsHelper.checkSubscriptionFunding(customerId, checkedFunding);

    expect(res).toBe(true);
    CustomerModel.verify();
  });

  it('should return true if checkedFunding does not have careDays in common with the other funding', async () => {
    const customerId = new ObjectID();
    const fundings = [
      {
        _id: new ObjectID(),
        subscription: checkedFundingSubscriptionId,
        versions: [{
          careDays: [4, 5],
          startDate: '2018-10-01',
          endDate: '2019-12-01',
        }],
      },
    ];
    CustomerModel.expects('findOne')
      .withExactArgs({ _id: customerId })
      .chain('lean')
      .once()
      .returns({ fundings });

    const res = await FundingsHelper.checkSubscriptionFunding(customerId, checkedFunding);

    expect(res).toBe(true);
    CustomerModel.verify();
  });

  it('should return true if checkedFunding startDate is after the other funding endDate', async () => {
    const customerId = new ObjectID();
    const fundings = [
      {
        _id: new ObjectID(),
        subscription: checkedFundingSubscriptionId,
        versions: [{
          careDays: [0, 1, 2, 3],
          startDate: '2018-10-01',
          endDate: '2018-12-01',
        }],
      },
    ];
    CustomerModel.expects('findOne')
      .withExactArgs({ _id: customerId })
      .chain('lean')
      .once()
      .returns({ fundings });

    const res = await FundingsHelper.checkSubscriptionFunding(customerId, checkedFunding);

    expect(res).toBe(true);
    CustomerModel.verify();
  });

  it('should return true if checkedFunding endDate is before the other funding startDate', async () => {
    const customerId = new ObjectID();
    const fundings = [
      {
        _id: new ObjectID(),
        subscription: checkedFundingSubscriptionId,
        versions: [{
          careDays: [0, 1, 2, 3],
          startDate: '2019-11-03',
          endDate: '2019-12-01',
        }],
      },
    ];
    CustomerModel.expects('findOne')
      .withExactArgs({ _id: customerId })
      .chain('lean')
      .once()
      .returns({ fundings });

    const res = await FundingsHelper.checkSubscriptionFunding(customerId, checkedFunding);

    expect(res).toBe(true);
    CustomerModel.verify();
  });

  it('should return true if checkedFunding and other fundings are not for the same subscription', async () => {
    const customerId = new ObjectID();
    const fundings = [
      {
        _id: new ObjectID(),
        subscription: new ObjectID(),
        versions: [{
          careDays: [0, 1, 2, 3],
          startDate: '2018-11-03',
          endDate: '2019-10-22',
        }],
      },
    ];
    CustomerModel.expects('findOne')
      .withExactArgs({ _id: customerId })
      .chain('lean')
      .once()
      .returns({ fundings });

    const res = await FundingsHelper.checkSubscriptionFunding(customerId, checkedFunding);

    expect(res).toBe(true);
    CustomerModel.verify();
  });

  it('should return false if checkedFunding has careDays in common with other fundings on same period', async () => {
    const customerId = new ObjectID();
    const fundings = [
      {
        _id: new ObjectID(),
        subscription: checkedFundingSubscriptionId,
        versions: [{
          careDays: [0, 1, 2, 3],
          startDate: '2018-11-03',
          endDate: '2019-10-22',
        }],
      },
    ];
    CustomerModel.expects('findOne')
      .withExactArgs({ _id: customerId })
      .chain('lean')
      .once()
      .returns({ fundings });

    const res = await FundingsHelper.checkSubscriptionFunding(customerId, checkedFunding);

    expect(res).toBe(false);
    CustomerModel.verify();
  });

  it('should return false if one of the fundings have a conflict with checked fundings', async () => {
    const customerId = new ObjectID();
    const fundings = [
      {
        _id: new ObjectID(),
        subscription: checkedFundingSubscriptionId,
        versions: [{
          careDays: [0, 1, 2, 3],
          startDate: '2018-11-03',
          endDate: '2019-10-22',
        }],
      },
      {
        _id: new ObjectID(),
        subscription: checkedFundingSubscriptionId,
        versions: [{
          careDays: [0, 1, 2, 3],
          startDate: '2018-10-01',
          endDate: '2018-12-01',
        }],
      },
    ];
    CustomerModel.expects('findOne')
      .withExactArgs({ _id: customerId })
      .chain('lean')
      .once()
      .returns({ fundings });

    const res = await FundingsHelper.checkSubscriptionFunding(customerId, checkedFunding);

    expect(res).toBe(false);
    CustomerModel.verify();
  });
});

describe('createFunding', () => {
  let checkSubscriptionFunding;
  let CustomerMock;
  let populateFundingsList;
  beforeEach(() => {
    checkSubscriptionFunding = sinon.stub(FundingsHelper, 'checkSubscriptionFunding');
    CustomerMock = sinon.mock(Customer);
    populateFundingsList = sinon.stub(FundingsHelper, 'populateFundingsList');
  });
  afterEach(() => {
    checkSubscriptionFunding.restore();
    CustomerMock.restore();
    populateFundingsList.restore();
  });

  it('should create funding if no conflict', async () => {
    const customerId = 'qwertyuiop';
    const payload = { subscription: '1234567890' };
    const customer = { _id: customerId };

    checkSubscriptionFunding.returns(true);
    CustomerMock.expects('findOneAndUpdate')
      .withExactArgs(
        { _id: customerId },
        { $push: { fundings: payload } },
        { new: true, select: { identity: 1, fundings: 1, subscriptions: 1 }, autopopulate: false }
      )
      .chain('populate')
      .withExactArgs({ path: 'subscriptions.service' })
      .chain('populate')
      .withExactArgs({ path: 'fundings.thirdPartyPayer' })
      .chain('lean')
      .once()
      .returns(customer);

    await FundingsHelper.createFunding(customerId, payload);

    sinon.assert.calledWithExactly(checkSubscriptionFunding, customerId, payload);
    sinon.assert.calledWithExactly(populateFundingsList, customer);
    CustomerMock.verify();
  });

  it('should throw an error if conflict', async () => {
    const customerId = 'qwertyuiop';
    const payload = { subscription: '1234567890' };

    try {
      checkSubscriptionFunding.returns(false);
      CustomerMock.expects('findOneAndUpdate').never();
      await FundingsHelper.createFunding(customerId, payload);
    } catch (e) {
      expect(e.output.statusCode).toEqual(409);
    } finally {
      sinon.assert.calledWithExactly(checkSubscriptionFunding, customerId, payload);
      sinon.assert.notCalled(populateFundingsList);
      CustomerMock.verify();
    }
  });
});

describe('updateFunding', () => {
  let checkSubscriptionFunding;
  let CustomerMock;
  let populateFundingsList;
  beforeEach(() => {
    checkSubscriptionFunding = sinon.stub(FundingsHelper, 'checkSubscriptionFunding');
    CustomerMock = sinon.mock(Customer);
    populateFundingsList = sinon.stub(FundingsHelper, 'populateFundingsList');
  });
  afterEach(() => {
    checkSubscriptionFunding.restore();
    CustomerMock.restore();
    populateFundingsList.restore();
  });

  it('should update funding if no conflict', async () => {
    const customerId = 'qwertyuiop';
    const fundingId = 'mnbvcxz';
    const payload = { subscription: '1234567890' };
    const customer = { _id: customerId };
    const checkPayload = { _id: fundingId, subscription: '1234567890', versions: [{ subscription: '1234567890' }] };

    checkSubscriptionFunding.returns(true);
    CustomerMock.expects('findOneAndUpdate')
      .withExactArgs(
        { _id: customerId, 'fundings._id': fundingId },
        { $push: { 'fundings.$.versions': payload } },
        { new: true, select: { identity: 1, fundings: 1, subscriptions: 1 }, autopopulate: false }
      )
      .chain('populate')
      .withExactArgs({ path: 'subscriptions.service' })
      .chain('populate')
      .withExactArgs({ path: 'fundings.thirdPartyPayer' })
      .chain('lean')
      .once()
      .returns(customer);

    await FundingsHelper.updateFunding(customerId, fundingId, payload);

    sinon.assert.calledWithExactly(checkSubscriptionFunding, customerId, checkPayload);
    sinon.assert.calledWithExactly(populateFundingsList, customer);
    CustomerMock.verify();
  });

  it('should throw an error if conflict', async () => {
    const customerId = 'qwertyuiop';
    const fundingId = 'mnbvcxz';
    const payload = { subscription: '1234567890' };
    const checkPayload = { _id: fundingId, subscription: '1234567890', versions: [{ subscription: '1234567890' }] };

    try {
      checkSubscriptionFunding.returns(false);
      CustomerMock.expects('findOneAndUpdate').never();
      await FundingsHelper.updateFunding(customerId, fundingId, payload);
    } catch (e) {
      expect(e.output.statusCode).toEqual(409);
    } finally {
      sinon.assert.calledWithExactly(checkSubscriptionFunding, customerId, checkPayload);
      sinon.assert.notCalled(populateFundingsList);
      CustomerMock.verify();
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
