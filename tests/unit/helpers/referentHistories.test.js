const sinon = require('sinon');
const moment = require('moment');
const { ObjectID } = require('mongodb');
const Customer = require('../../../src/models/Customer');
const ReferentHistory = require('../../../src/models/ReferentHistory');
const ReferentHistoriesHelper = require('../../../src/helpers/referentHistories');

require('sinon-mongoose');

describe('', () => {
  let CustomerMock;
  let ReferentHistoryMock;
  let createReferentHistory;
  let updateLastHistory;
  const customerId = new ObjectID();
  const company = { _id: new ObjectID() };
  beforeEach(() => {
    CustomerMock = sinon.mock(Customer);
    ReferentHistoryMock = sinon.mock(ReferentHistory);
    createReferentHistory = sinon.stub(ReferentHistoriesHelper, 'createReferentHistory');
    updateLastHistory = sinon.stub(ReferentHistoriesHelper, 'updateLastHistory');
  });
  afterEach(() => {
    CustomerMock.restore();
    ReferentHistoryMock.restore();
    createReferentHistory.restore();
    updateLastHistory.restore();
  });

  describe('no previous history', () => {
    it('Case 1 : no referent in payload', async () => {
      ReferentHistoryMock.expects('find')
        .withExactArgs({ customer: customerId, company: company._id })
        .chain('sort')
        .withExactArgs({ startDate: -1 })
        .chain('limit')
        .withExactArgs(1)
        .chain('lean')
        .once()
        .returns([]);
      CustomerMock.expects('findOne').never();

      await ReferentHistoriesHelper.updateCustomerReferent(customerId, null, company);
      sinon.assert.notCalled(updateLastHistory);
      sinon.assert.notCalled(createReferentHistory);
      CustomerMock.verify();
      ReferentHistoryMock.verify();
    });
    it('Case 2 : referent in payload', async () => {
      const referent = new ObjectID();
      ReferentHistoryMock.expects('find')
        .withExactArgs({ customer: customerId, company: company._id })
        .chain('sort')
        .withExactArgs({ startDate: -1 })
        .chain('limit')
        .withExactArgs(1)
        .chain('lean')
        .once()
        .returns([]);
      CustomerMock.expects('findOne').never();

      await ReferentHistoriesHelper.updateCustomerReferent(customerId, referent.toHexString(), company);
      sinon.assert.notCalled(updateLastHistory);
      sinon.assert.calledOnceWithExactly(createReferentHistory, customerId, referent.toHexString(), company);
      CustomerMock.verify();
      ReferentHistoryMock.verify();
    });
  });
  describe('previous history with endDate before yesterday', () => {
    it('Case 3 : no referent in payload', async () => {
      const lastHistory = { endDate: moment().subtract(1, 'month').toDate() };
      ReferentHistoryMock.expects('find')
        .withExactArgs({ customer: customerId, company: company._id })
        .chain('sort')
        .withExactArgs({ startDate: -1 })
        .chain('limit')
        .withExactArgs(1)
        .chain('lean')
        .once()
        .returns([lastHistory]);
      CustomerMock.expects('findOne').never();

      await ReferentHistoriesHelper.updateCustomerReferent(customerId, null, company);
      sinon.assert.notCalled(updateLastHistory);
      sinon.assert.notCalled(createReferentHistory);
      CustomerMock.verify();
      ReferentHistoryMock.verify();
    });
    it('Case 4 : referent in payload', async () => {
      const referent = new ObjectID();
      const lastHistory = { endDate: moment().subtract(1, 'month').toDate() };
      ReferentHistoryMock.expects('find')
        .withExactArgs({ customer: customerId, company: company._id })
        .chain('sort')
        .withExactArgs({ startDate: -1 })
        .chain('limit')
        .withExactArgs(1)
        .chain('lean')
        .once()
        .returns([lastHistory]);
      CustomerMock.expects('findOne').never();

      await ReferentHistoriesHelper.updateCustomerReferent(customerId, referent.toHexString(), company);
      sinon.assert.notCalled(updateLastHistory);
      sinon.assert.calledOnceWithExactly(createReferentHistory, customerId, referent.toHexString(), company);
      CustomerMock.verify();
      ReferentHistoryMock.verify();
    });
  });
  describe('previous history ends yesterday', () => {
    it('Case 5 : no referent in payload', async () => {
      const lastHistory = { endDate: moment().subtract(1, 'd').endOf('d').toDate() };
      ReferentHistoryMock.expects('find')
        .withExactArgs({ customer: customerId, company: company._id })
        .chain('sort')
        .withExactArgs({ startDate: -1 })
        .chain('limit')
        .withExactArgs(1)
        .chain('lean')
        .once()
        .returns([lastHistory]);
      CustomerMock.expects('findOne').never();

      await ReferentHistoriesHelper.updateCustomerReferent(customerId, null, company);
      sinon.assert.notCalled(updateLastHistory);
      sinon.assert.notCalled(createReferentHistory);
      CustomerMock.verify();
      ReferentHistoryMock.verify();
    });
    it('Case 6 : same referent between payload and last history', async () => {
      const referent = new ObjectID();
      const lastHistory = { endDate: moment().subtract(1, 'd').endOf('d').toDate(), auxiliary: { _id: referent } };
      ReferentHistoryMock.expects('find')
        .withExactArgs({ customer: customerId, company: company._id })
        .chain('sort')
        .withExactArgs({ startDate: -1 })
        .chain('limit')
        .withExactArgs(1)
        .chain('lean')
        .once()
        .returns([lastHistory]);
      CustomerMock.expects('findOne').never();

      await ReferentHistoriesHelper.updateCustomerReferent(customerId, referent.toHexString(), company);
      sinon.assert.calledOnceWithExactly(updateLastHistory, lastHistory, { $unset: { endDate: '' } });
      sinon.assert.notCalled(createReferentHistory);
      CustomerMock.verify();
      ReferentHistoryMock.verify();
    });
    it('Case 7 : referent in payload', async () => {
      const referent = new ObjectID();
      const lastHistory = {
        endDate: moment().subtract(1, 'd').endOf('d').toDate(),
        auxiliary: { _id: new ObjectID() },
      };
      ReferentHistoryMock.expects('find')
        .withExactArgs({ customer: customerId, company: company._id })
        .chain('sort')
        .withExactArgs({ startDate: -1 })
        .chain('limit')
        .withExactArgs(1)
        .chain('lean')
        .once()
        .returns([lastHistory]);
      CustomerMock.expects('findOne').never();

      await ReferentHistoriesHelper.updateCustomerReferent(customerId, referent.toHexString(), company);
      sinon.assert.notCalled(updateLastHistory);
      sinon.assert.calledOnceWithExactly(createReferentHistory, customerId, referent.toHexString(), company);
      CustomerMock.verify();
      ReferentHistoryMock.verify();
    });
  });
  describe('previous history has no end date or end after yesterday', () => {
    it('Case 8 : no referent and previous history starts today', async () => {
      const lastHistory = { startDate: moment().startOf('d').toDate(), _id: new ObjectID() };
      ReferentHistoryMock.expects('find')
        .withExactArgs({ customer: customerId, company: company._id })
        .chain('sort')
        .withExactArgs({ startDate: -1 })
        .chain('limit')
        .withExactArgs(1)
        .chain('lean')
        .once()
        .returns([lastHistory]);
      CustomerMock.expects('findOne')
        .withExactArgs({ _id: customerId })
        .chain('populate')
        .withExactArgs({ path: 'firstIntervention', select: 'startDate', match: { company: company._id } })
        .chain('lean')
        .once()
        .returns({ firstIntervention: { startDate: moment().toDate() } });
      ReferentHistoryMock.expects('deleteOne').withExactArgs({ _id: lastHistory._id }).once();

      await ReferentHistoriesHelper.updateCustomerReferent(customerId, null, company);
      sinon.assert.notCalled(updateLastHistory);
      sinon.assert.notCalled(createReferentHistory);
      CustomerMock.verify();
      ReferentHistoryMock.verify();
    });
    it('Case 9 : no referent and customer doesn\'t have first intervention', async () => {
      const lastHistory = { startDate: moment().subtract(1, 'month').startOf('d').toDate(), _id: new ObjectID() };
      ReferentHistoryMock.expects('find')
        .withExactArgs({ customer: customerId, company: company._id })
        .chain('sort')
        .withExactArgs({ startDate: -1 })
        .chain('limit')
        .withExactArgs(1)
        .chain('lean')
        .once()
        .returns([lastHistory]);
      CustomerMock.expects('findOne')
        .withExactArgs({ _id: customerId })
        .chain('populate')
        .withExactArgs({ path: 'firstIntervention', select: 'startDate', match: { company: company._id } })
        .chain('lean')
        .once()
        .returns({});
      ReferentHistoryMock.expects('deleteOne').withExactArgs({ _id: lastHistory._id }).once();

      await ReferentHistoriesHelper.updateCustomerReferent(customerId, null, company);
      sinon.assert.notCalled(updateLastHistory);
      sinon.assert.notCalled(createReferentHistory);
      CustomerMock.verify();
      ReferentHistoryMock.verify();
    });
    it('Case 10 : no referent', async () => {
      const lastHistory = { startDate: moment().subtract(1, 'month').startOf('d').toDate(), _id: new ObjectID() };
      ReferentHistoryMock.expects('find')
        .withExactArgs({ customer: customerId, company: company._id })
        .chain('sort')
        .withExactArgs({ startDate: -1 })
        .chain('limit')
        .withExactArgs(1)
        .chain('lean')
        .once()
        .returns([lastHistory]);
      CustomerMock.expects('findOne')
        .withExactArgs({ _id: customerId })
        .chain('populate')
        .withExactArgs({ path: 'firstIntervention', select: 'startDate', match: { company: company._id } })
        .chain('lean')
        .once()
        .returns({ firstIntervention: { startDate: moment().toDate() } });
      ReferentHistoryMock.expects('deleteOne').never();

      await ReferentHistoriesHelper.updateCustomerReferent(customerId, null, company);
      sinon.assert.calledOnceWithExactly(
        updateLastHistory,
        lastHistory,
        { endDate: moment().subtract(1, 'd').endOf('d').toDate() }
      );
      sinon.assert.notCalled(createReferentHistory);
      CustomerMock.verify();
      ReferentHistoryMock.verify();
    });
    it('Case 11 : same referent', async () => {
      const referent = new ObjectID();
      const lastHistory = { auxiliary: { _id: referent }, _id: new ObjectID() };
      ReferentHistoryMock.expects('find')
        .withExactArgs({ customer: customerId, company: company._id })
        .chain('sort')
        .withExactArgs({ startDate: -1 })
        .chain('limit')
        .withExactArgs(1)
        .chain('lean')
        .once()
        .returns([lastHistory]);
      CustomerMock.expects('findOne')
        .withExactArgs({ _id: customerId })
        .chain('populate')
        .withExactArgs({ path: 'firstIntervention', select: 'startDate', match: { company: company._id } })
        .chain('lean')
        .once()
        .returns({ firstIntervention: { startDate: moment().toDate() } });
      ReferentHistoryMock.expects('deleteOne').never();

      await ReferentHistoriesHelper.updateCustomerReferent(customerId, referent.toHexString(), company);
      sinon.assert.notCalled(updateLastHistory);
      sinon.assert.notCalled(createReferentHistory);
      CustomerMock.verify();
      ReferentHistoryMock.verify();
    });
    it('Case 12 : customer doesn\'t have first intervention', async () => {
      const referent = new ObjectID();
      const lastHistory = { auxiliary: { _id: new ObjectID() }, _id: new ObjectID() };
      ReferentHistoryMock.expects('find')
        .withExactArgs({ customer: customerId, company: company._id })
        .chain('sort')
        .withExactArgs({ startDate: -1 })
        .chain('limit')
        .withExactArgs(1)
        .chain('lean')
        .once()
        .returns([lastHistory]);
      CustomerMock.expects('findOne')
        .withExactArgs({ _id: customerId })
        .chain('populate')
        .withExactArgs({ path: 'firstIntervention', select: 'startDate', match: { company: company._id } })
        .chain('lean')
        .once()
        .returns({});
      ReferentHistoryMock.expects('deleteOne').never();

      await ReferentHistoriesHelper.updateCustomerReferent(customerId, referent.toHexString(), company);
      sinon.assert.calledOnceWithExactly(
        updateLastHistory,
        lastHistory,
        { startDate: moment().startOf('d').toDate(), auxiliary: referent.toHexString() }
      );
      sinon.assert.notCalled(createReferentHistory);
      CustomerMock.verify();
      ReferentHistoryMock.verify();
    });
    it('Case 13 : previous history starts today', async () => {
      const referent = new ObjectID();
      const lastHistory = { auxiliary: { _id: new ObjectID() }, _id: new ObjectID() };
      ReferentHistoryMock.expects('find')
        .withExactArgs({ customer: customerId, company: company._id })
        .chain('sort')
        .withExactArgs({ startDate: -1 })
        .chain('limit')
        .withExactArgs(1)
        .chain('lean')
        .once()
        .returns([lastHistory]);
      CustomerMock.expects('findOne')
        .withExactArgs({ _id: customerId })
        .chain('populate')
        .withExactArgs({ path: 'firstIntervention', select: 'startDate', match: { company: company._id } })
        .chain('lean')
        .once()
        .returns({ firstIntervention: { startDate: moment().toDate() } });
      ReferentHistoryMock.expects('deleteOne').never();

      await ReferentHistoriesHelper.updateCustomerReferent(customerId, referent.toHexString(), company);
      sinon.assert.calledOnceWithExactly(
        updateLastHistory,
        lastHistory,
        { endDate: moment().subtract(1, 'd').endOf('d').toDate() }
      );
      sinon.assert.calledOnceWithExactly(createReferentHistory, customerId, referent.toHexString(), company);
      CustomerMock.verify();
      ReferentHistoryMock.verify();
    });
  });
});
