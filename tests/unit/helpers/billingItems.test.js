const sinon = require('sinon');
const { ObjectID } = require('mongodb');
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
    const companyId = new ObjectID();
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
    const companyId = new ObjectID();
    const credentials = { company: { _id: companyId } };

    find.returns([{ name: 'Billing Eilish', type: 'manual', defaultUnitAmount: 20, company: companyId }]);

    await BillingItemsHelper.list(credentials);

    sinon.assert.calledOnceWithExactly(find, { company: companyId });
  });
});
