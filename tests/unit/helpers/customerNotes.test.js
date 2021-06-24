const sinon = require('sinon');
const expect = require('expect');
const { ObjectID } = require('mongodb');
const CustomerNote = require('../../../src/models/CustomerNote');
const CustomerNotesHelper = require('../../../src/helpers/customerNotes');
const SinonMongoose = require('../sinonMongoose');

describe('createCustomerNote', () => {
  let create;
  beforeEach(() => {
    create = sinon.stub(CustomerNote, 'create');
  });
  afterEach(() => {
    create.restore();
  });

  it('should create customer partner', async () => {
    const payload = { partner: new ObjectID(), customer: new ObjectID() };
    const credentials = { company: { _id: new ObjectID() } };
    await CustomerNotesHelper.createCustomerNote(payload, credentials);

    sinon.assert.calledOnceWithExactly(create, { ...payload, company: credentials.company._id });
  });
});

describe('list', () => {
  let find;
  beforeEach(() => {
    find = sinon.stub(CustomerNote, 'find');
  });
  afterEach(() => {
    find.restore();
  });

  it('should return customer notes', async () => {
    const customer = new ObjectID();
    const credentials = { company: { _id: new ObjectID() } };
    const customerNotes = [
      { _id: new ObjectID(), title: 'test' },
      { _id: new ObjectID(), title: 'test 2' },
    ];

    find.returns(SinonMongoose.stubChainedQueries([customerNotes], ['sort', 'lean']));

    const result = await CustomerNotesHelper.list(customer, credentials);

    expect(result).toMatchObject(customerNotes);
    SinonMongoose.calledWithExactly(
      find,
      [
        { query: 'find', args: [{ customer, company: credentials.company._id }] },
        { query: 'sort', args: [{ updatedAt: -1 }] },
        { query: 'lean' },
      ]
    );
  });
});
