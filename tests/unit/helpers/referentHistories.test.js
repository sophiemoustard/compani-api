const sinon = require('sinon');
const moment = require('moment');
const { ObjectID } = require('mongodb');
const Customer = require('../../../src/models/Customer');
const ReferentHistory = require('../../../src/models/ReferentHistory');
const ReferentHistoriesHelper = require('../../../src/helpers/referentHistories');
const SinonMongoose = require('../sinonMongoose');

describe('updateCustomerReferent', () => {
  let findOneCustomer;
  let findReferentHistory;
  let deleteOneReferentHistory;
  let createReferentHistory;
  let updateLastHistory;
  const customerId = new ObjectID();
  const company = { _id: new ObjectID() };
  beforeEach(() => {
    findOneCustomer = sinon.stub(Customer, 'findOne');
    findReferentHistory = sinon.stub(ReferentHistory, 'find');
    deleteOneReferentHistory = sinon.stub(ReferentHistory, 'deleteOne');
    createReferentHistory = sinon.stub(ReferentHistoriesHelper, 'createReferentHistory');
    updateLastHistory = sinon.stub(ReferentHistoriesHelper, 'updateLastHistory');
  });
  afterEach(() => {
    findOneCustomer.restore();
    findReferentHistory.restore();
    deleteOneReferentHistory.restore();
    createReferentHistory.restore();
    updateLastHistory.restore();
  });

  describe('no previous history', () => {
    it('Case 1 : no referent in payload', async () => {
      findReferentHistory.returns(SinonMongoose.stubChainedQueries([[]], ['sort', 'limit', 'lean']));

      await ReferentHistoriesHelper.updateCustomerReferent(customerId, null, company);
      sinon.assert.notCalled(updateLastHistory);
      sinon.assert.notCalled(createReferentHistory);
      sinon.assert.notCalled(findOneCustomer);
      sinon.assert.notCalled(deleteOneReferentHistory);
      SinonMongoose.calledWithExactly(
        findReferentHistory,
        [
          { query: 'find', args: [{ customer: customerId, company: company._id }] },
          { query: 'sort', args: [{ startDate: -1 }] },
          { query: 'limit', args: [1] },
          { query: 'lean' },
        ]
      );
    });
    it('Case 2 : referent in payload', async () => {
      const referent = new ObjectID();

      findReferentHistory.returns(SinonMongoose.stubChainedQueries([[]], ['sort', 'limit', 'lean']));

      await ReferentHistoriesHelper.updateCustomerReferent(customerId, referent.toHexString(), company);
      sinon.assert.notCalled(updateLastHistory);
      sinon.assert.calledOnceWithExactly(createReferentHistory, customerId, referent.toHexString(), company);
      sinon.assert.notCalled(findOneCustomer);
      sinon.assert.notCalled(deleteOneReferentHistory);
      SinonMongoose.calledWithExactly(
        findReferentHistory,
        [
          { query: 'find', args: [{ customer: customerId, company: company._id }] },
          { query: 'sort', args: [{ startDate: -1 }] },
          { query: 'limit', args: [1] },
          { query: 'lean' },
        ]
      );
    });
  });
  describe('previous history with endDate before yesterday', () => {
    it('Case 1 : no referent in payload', async () => {
      const lastHistory = { endDate: moment().subtract(1, 'month').toDate() };

      findReferentHistory.returns(SinonMongoose.stubChainedQueries([[lastHistory]], ['sort', 'limit', 'lean']));

      await ReferentHistoriesHelper.updateCustomerReferent(customerId, null, company);
      sinon.assert.notCalled(updateLastHistory);
      sinon.assert.notCalled(createReferentHistory);
      sinon.assert.notCalled(findOneCustomer);
      sinon.assert.notCalled(deleteOneReferentHistory);
      SinonMongoose.calledWithExactly(
        findReferentHistory,
        [
          { query: 'find', args: [{ customer: customerId, company: company._id }] },
          { query: 'sort', args: [{ startDate: -1 }] },
          { query: 'limit', args: [1] },
          { query: 'lean' },
        ]
      );
    });
    it('Case 2 : referent in payload', async () => {
      const referent = new ObjectID();
      const lastHistory = { endDate: moment().subtract(1, 'month').toDate() };

      findReferentHistory.returns(SinonMongoose.stubChainedQueries([[lastHistory]], ['sort', 'limit', 'lean']));

      await ReferentHistoriesHelper.updateCustomerReferent(customerId, referent.toHexString(), company);
      sinon.assert.notCalled(updateLastHistory);
      sinon.assert.calledOnceWithExactly(createReferentHistory, customerId, referent.toHexString(), company);
      sinon.assert.notCalled(findOneCustomer);
      sinon.assert.notCalled(deleteOneReferentHistory);
      SinonMongoose.calledWithExactly(
        findReferentHistory,
        [
          { query: 'find', args: [{ customer: customerId, company: company._id }] },
          { query: 'sort', args: [{ startDate: -1 }] },
          { query: 'limit', args: [1] },
          { query: 'lean' },
        ]
      );
    });
  });
  describe('previous history ends yesterday', () => {
    it('Case 1 : no referent in payload', async () => {
      const lastHistory = { endDate: moment().subtract(1, 'd').endOf('d').toDate() };

      findReferentHistory.returns(SinonMongoose.stubChainedQueries([[lastHistory]], ['sort', 'limit', 'lean']));

      await ReferentHistoriesHelper.updateCustomerReferent(customerId, null, company);
      sinon.assert.notCalled(updateLastHistory);
      sinon.assert.notCalled(createReferentHistory);
      sinon.assert.notCalled(findOneCustomer);
      sinon.assert.notCalled(deleteOneReferentHistory);
      SinonMongoose.calledWithExactly(
        findReferentHistory,
        [
          { query: 'find', args: [{ customer: customerId, company: company._id }] },
          { query: 'sort', args: [{ startDate: -1 }] },
          { query: 'limit', args: [1] },
          { query: 'lean' },
        ]
      );
    });
    it('Case 2 : same referent between payload and last history', async () => {
      const referent = new ObjectID();
      const lastHistory = { endDate: moment().subtract(1, 'd').endOf('d').toDate(), auxiliary: { _id: referent } };

      findReferentHistory.returns(SinonMongoose.stubChainedQueries([[lastHistory]], ['sort', 'limit', 'lean']));

      await ReferentHistoriesHelper.updateCustomerReferent(customerId, referent.toHexString(), company);
      sinon.assert.calledOnceWithExactly(updateLastHistory, lastHistory, { $unset: { endDate: '' } });
      sinon.assert.notCalled(createReferentHistory);
      sinon.assert.notCalled(findOneCustomer);
      sinon.assert.notCalled(deleteOneReferentHistory);
      SinonMongoose.calledWithExactly(
        findReferentHistory,
        [
          { query: 'find', args: [{ customer: customerId, company: company._id }] },
          { query: 'sort', args: [{ startDate: -1 }] },
          { query: 'limit', args: [1] },
          { query: 'lean' },
        ]
      );
    });
    it('Case 3 : referent in payload', async () => {
      const referent = new ObjectID();
      const lastHistory = {
        endDate: moment().subtract(1, 'd').endOf('d').toDate(),
        auxiliary: { _id: new ObjectID() },
      };

      findReferentHistory.returns(SinonMongoose.stubChainedQueries([[lastHistory]], ['sort', 'limit', 'lean']));

      await ReferentHistoriesHelper.updateCustomerReferent(customerId, referent.toHexString(), company);
      sinon.assert.notCalled(updateLastHistory);
      sinon.assert.calledOnceWithExactly(createReferentHistory, customerId, referent.toHexString(), company);
      sinon.assert.notCalled(findOneCustomer);
      sinon.assert.notCalled(deleteOneReferentHistory);
      SinonMongoose.calledWithExactly(
        findReferentHistory,
        [
          { query: 'find', args: [{ customer: customerId, company: company._id }] },
          { query: 'sort', args: [{ startDate: -1 }] },
          { query: 'limit', args: [1] },
          { query: 'lean' },
        ]
      );
    });
  });
  describe('previous history has no end date or end after yesterday', () => {
    it('Case 1 : no referent and previous history starts today', async () => {
      const lastHistory = { startDate: moment().startOf('d').toDate(), _id: new ObjectID() };

      findReferentHistory.returns(SinonMongoose.stubChainedQueries([[lastHistory]], ['sort', 'limit', 'lean']));
      findOneCustomer.returns(SinonMongoose.stubChainedQueries(
        [{ firstIntervention: { startDate: moment().toDate() } }]
      ));

      await ReferentHistoriesHelper.updateCustomerReferent(customerId, null, company);
      sinon.assert.notCalled(updateLastHistory);
      sinon.assert.notCalled(createReferentHistory);
      sinon.assert.calledOnceWithExactly(deleteOneReferentHistory, { _id: lastHistory._id });
      SinonMongoose.calledWithExactly(
        findReferentHistory,
        [
          { query: 'find', args: [{ customer: customerId, company: company._id }] },
          { query: 'sort', args: [{ startDate: -1 }] },
          { query: 'limit', args: [1] },
          { query: 'lean' },
        ]
      );
      SinonMongoose.calledWithExactly(
        findOneCustomer,
        [
          { query: 'find', args: [{ _id: customerId }] },
          {
            query: 'populate',
            args: [{ path: 'firstIntervention', select: 'startDate', match: { company: company._id } }],
          },
          { query: 'lean' },
        ]
      );
    });
    it('Case 2 : no referent and customer doesn\'t have first intervention', async () => {
      const lastHistory = { startDate: moment().subtract(1, 'month').startOf('d').toDate(), _id: new ObjectID() };

      findReferentHistory.returns(SinonMongoose.stubChainedQueries([[lastHistory]], ['sort', 'limit', 'lean']));
      findOneCustomer.returns(SinonMongoose.stubChainedQueries([{}]));

      await ReferentHistoriesHelper.updateCustomerReferent(customerId, null, company);
      sinon.assert.notCalled(updateLastHistory);
      sinon.assert.notCalled(createReferentHistory);
      sinon.assert.calledOnceWithExactly(deleteOneReferentHistory, { _id: lastHistory._id });
      SinonMongoose.calledWithExactly(
        findReferentHistory,
        [
          { query: 'find', args: [{ customer: customerId, company: company._id }] },
          { query: 'sort', args: [{ startDate: -1 }] },
          { query: 'limit', args: [1] },
          { query: 'lean' },
        ]
      );
      SinonMongoose.calledWithExactly(
        findOneCustomer,
        [
          { query: 'find', args: [{ _id: customerId }] },
          {
            query: 'populate',
            args: [{ path: 'firstIntervention', select: 'startDate', match: { company: company._id } }],
          },
          { query: 'lean' },
        ]
      );
    });
    it('Case 3 : no referent', async () => {
      const lastHistory = { startDate: moment().subtract(1, 'month').startOf('d').toDate(), _id: new ObjectID() };

      findReferentHistory.returns(SinonMongoose.stubChainedQueries([[lastHistory]], ['sort', 'limit', 'lean']));
      findOneCustomer.returns(SinonMongoose.stubChainedQueries(
        [{ firstIntervention: { startDate: moment().toDate() } }]
      ));

      await ReferentHistoriesHelper.updateCustomerReferent(customerId, null, company);
      sinon.assert.calledOnceWithExactly(
        updateLastHistory,
        lastHistory,
        { endDate: moment().subtract(1, 'd').endOf('d').toDate() }
      );
      sinon.assert.notCalled(createReferentHistory);
      sinon.assert.notCalled(deleteOneReferentHistory);
      SinonMongoose.calledWithExactly(
        findReferentHistory,
        [
          { query: 'find', args: [{ customer: customerId, company: company._id }] },
          { query: 'sort', args: [{ startDate: -1 }] },
          { query: 'limit', args: [1] },
          { query: 'lean' },
        ]
      );
      SinonMongoose.calledWithExactly(
        findOneCustomer,
        [
          { query: 'find', args: [{ _id: customerId }] },
          {
            query: 'populate',
            args: [{ path: 'firstIntervention', select: 'startDate', match: { company: company._id } }],
          },
          { query: 'lean' },
        ]
      );
    });
    it('Case 4 : same referent', async () => {
      const referent = new ObjectID();
      const lastHistory = { auxiliary: { _id: referent }, _id: new ObjectID() };

      findReferentHistory.returns(SinonMongoose.stubChainedQueries([[lastHistory]], ['sort', 'limit', 'lean']));
      findOneCustomer.returns(SinonMongoose.stubChainedQueries(
        [{ firstIntervention: { startDate: moment().toDate() } }]
      ));

      await ReferentHistoriesHelper.updateCustomerReferent(customerId, referent.toHexString(), company);
      sinon.assert.notCalled(updateLastHistory);
      sinon.assert.notCalled(createReferentHistory);
      sinon.assert.notCalled(deleteOneReferentHistory);
      SinonMongoose.calledWithExactly(
        findReferentHistory,
        [
          { query: 'find', args: [{ customer: customerId, company: company._id }] },
          { query: 'sort', args: [{ startDate: -1 }] },
          { query: 'limit', args: [1] },
          { query: 'lean' },
        ]
      );
      SinonMongoose.calledWithExactly(
        findOneCustomer,
        [
          { query: 'find', args: [{ _id: customerId }] },
          {
            query: 'populate',
            args: [{ path: 'firstIntervention', select: 'startDate', match: { company: company._id } }],
          },
          { query: 'lean' },
        ]
      );
    });
    it('Case 5 : customer doesn\'t have first intervention', async () => {
      const referent = new ObjectID();
      const lastHistory = { auxiliary: { _id: new ObjectID() }, _id: new ObjectID() };

      findReferentHistory.returns(SinonMongoose.stubChainedQueries([[lastHistory]], ['sort', 'limit', 'lean']));
      findOneCustomer.returns(SinonMongoose.stubChainedQueries([{}]));

      await ReferentHistoriesHelper.updateCustomerReferent(customerId, referent.toHexString(), company);
      sinon.assert.calledOnceWithExactly(
        updateLastHistory,
        lastHistory,
        { startDate: moment().startOf('d').toDate(), auxiliary: referent.toHexString() }
      );
      sinon.assert.notCalled(createReferentHistory);
      sinon.assert.notCalled(deleteOneReferentHistory);
      SinonMongoose.calledWithExactly(
        findReferentHistory,
        [
          { query: 'find', args: [{ customer: customerId, company: company._id }] },
          { query: 'sort', args: [{ startDate: -1 }] },
          { query: 'limit', args: [1] },
          { query: 'lean' },
        ]
      );
      SinonMongoose.calledWithExactly(
        findOneCustomer,
        [
          { query: 'find', args: [{ _id: customerId }] },
          {
            query: 'populate',
            args: [{ path: 'firstIntervention', select: 'startDate', match: { company: company._id } }],
          },
          { query: 'lean' },
        ]
      );
    });
    it('Case 6 : previous history starts on same day', async () => {
      const referent = new ObjectID();
      const lastHistory = {
        startDate: moment().startOf('d').toDate(),
        _id: new ObjectID(),
        auxiliary: { _id: new ObjectID() },
      };

      findReferentHistory.returns(SinonMongoose.stubChainedQueries([[lastHistory]], ['sort', 'limit', 'lean']));
      findOneCustomer.returns(SinonMongoose.stubChainedQueries(
        [{ firstIntervention: { startDate: moment().toDate() } }]
      ));

      await ReferentHistoriesHelper.updateCustomerReferent(customerId, referent.toHexString(), company);
      sinon.assert.calledOnceWithExactly(updateLastHistory, lastHistory, { auxiliary: referent.toHexString() });
      sinon.assert.notCalled(createReferentHistory);
      sinon.assert.notCalled(deleteOneReferentHistory);
      SinonMongoose.calledWithExactly(
        findReferentHistory,
        [
          { query: 'find', args: [{ customer: customerId, company: company._id }] },
          { query: 'sort', args: [{ startDate: -1 }] },
          { query: 'limit', args: [1] },
          { query: 'lean' },
        ]
      );
      SinonMongoose.calledWithExactly(
        findOneCustomer,
        [
          { query: 'find', args: [{ _id: customerId }] },
          {
            query: 'populate',
            args: [{ path: 'firstIntervention', select: 'startDate', match: { company: company._id } }],
          },
          { query: 'lean' },
        ]
      );
    });
    it('Case 7 : different startDate and different auxiliary', async () => {
      const referent = new ObjectID();
      const lastHistory = { auxiliary: { _id: new ObjectID() }, _id: new ObjectID() };

      findReferentHistory.returns(SinonMongoose.stubChainedQueries([[lastHistory]], ['sort', 'limit', 'lean']));
      findOneCustomer.returns(SinonMongoose.stubChainedQueries(
        [{ firstIntervention: { startDate: moment().toDate() } }]
      ));

      await ReferentHistoriesHelper.updateCustomerReferent(customerId, referent.toHexString(), company);
      sinon.assert.calledOnceWithExactly(
        updateLastHistory,
        lastHistory,
        { endDate: moment().subtract(1, 'd').endOf('d').toDate() }
      );
      sinon.assert.calledOnceWithExactly(createReferentHistory, customerId, referent.toHexString(), company);
      sinon.assert.notCalled(deleteOneReferentHistory);
      SinonMongoose.calledWithExactly(
        findReferentHistory,
        [
          { query: 'find', args: [{ customer: customerId, company: company._id }] },
          { query: 'sort', args: [{ startDate: -1 }] },
          { query: 'limit', args: [1] },
          { query: 'lean' },
        ]
      );
      SinonMongoose.calledWithExactly(
        findOneCustomer,
        [
          { query: 'find', args: [{ _id: customerId }] },
          {
            query: 'populate',
            args: [{ path: 'firstIntervention', select: 'startDate', match: { company: company._id } }],
          },
          { query: 'lean' },
        ]
      );
    });
  });
});
