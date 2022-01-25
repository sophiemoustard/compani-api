const sinon = require('sinon');
const { ObjectId } = require('mongodb');
const BillingItem = require('../../../src/models/BillingItem');
const BillingItemsHelper = require('../../../src/helpers/billingItems');

describe('create', () => {
  let create;
  beforeEach(() => {
    create = sinon.stub(BillingItem, 'create');
  });
  afterEach(() => {
    create.restore();
  });

  it('should create a billing item', async () => {
    const companyId = new ObjectId();
    const credentials = { company: { _id: companyId } };
    const newBillingItem = { name: 'Billing Eilish', type: 'manual', defaultUnitAmount: 20, vat: 2 };

    create.returns(newBillingItem);

    await BillingItemsHelper.create(newBillingItem, credentials);

    sinon.assert.calledOnceWithExactly(
      create,
      { name: 'Billing Eilish', type: 'manual', defaultUnitAmount: 20, vat: 2, company: companyId }
    );
  });
});

describe('list', () => {
  let find;
  beforeEach(() => {
    find = sinon.stub(BillingItem, 'find');
  });
  afterEach(() => {
    find.restore();
  });

  it('should every billing items from user\'s company', async () => {
    const companyId = new ObjectId();
    const credentials = { company: { _id: companyId } };

    find.returns([{ name: 'Billing Eilish', type: 'manual', defaultUnitAmount: 20, company: companyId, vat: 2 }]);

    await BillingItemsHelper.list(credentials);

    sinon.assert.calledOnceWithExactly(find, { company: companyId });
  });
});

describe('remove', () => {
  let deleteOne;
  beforeEach(() => {
    deleteOne = sinon.stub(BillingItem, 'deleteOne');
  });
  afterEach(() => {
    deleteOne.restore();
  });

  it('should remove a billing item', async () => {
    const billingItemId = new ObjectId();

    deleteOne.returns(billingItemId);

    await BillingItemsHelper.remove(billingItemId);

    sinon.assert.calledOnceWithExactly(deleteOne, { _id: billingItemId });
  });
});
