const sinon = require('sinon');
const { ObjectID } = require('mongodb');
const BillingItem = require('../../../src/models/BillingItem');
const BillingItemHelper = require('../../../src/helpers/billingItems');

describe('create', () => {
  let create;
  beforeEach(() => {
    create = sinon.stub(BillingItem, 'create');
  });
  afterEach(() => {
    create.restore();
  });

  it('should create a billing item', async () => {
    const newBillingItem = {
      name: 'name',
      type: 'intra',
      defaultUnitAmount: 20,
      vat: 2,
      company: new ObjectID(),
    };

    create.returns(newBillingItem);

    await BillingItemHelper.create(newBillingItem);

    sinon.assert.calledOnceWithExactly(
      create,
      { name: 'Billing Eilish', type: 'manual', defaultUnitAmount: 20, vat: 2, company: newBillingItem.company }
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

  it('should create a billing item', async () => {
    const credentials = { company: { _id: new ObjectID() } };

    find.returns([{ name: 'Billing Eilish', type: 'manual', defaultUnitAmount: 20, company: credentials.company._id }]);

    await BillingItemHelper.list(credentials);

    sinon.assert.calledOnceWithExactly(find, { company: credentials.company._id });
  });
});
