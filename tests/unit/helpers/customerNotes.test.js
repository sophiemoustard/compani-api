const sinon = require('sinon');
const expect = require('expect');
const { ObjectID } = require('mongodb');
const CustomerNote = require('../../../src/models/CustomerNote');
const CustomerNotesHelper = require('../../../src/helpers/customerNotes');
const SinonMongoose = require('../sinonMongoose');
const CustomerNoteHistory = require('../../../src/models/CustomerNoteHistory');
const { NOTE_CREATION } = require('../../../src/helpers/constants');

describe('create', () => {
  let create;
  let createCustomerNoteHistory;
  beforeEach(() => {
    create = sinon.stub(CustomerNote, 'create');
    createCustomerNoteHistory = sinon.stub(CustomerNoteHistory, 'create');
  });
  afterEach(() => {
    create.restore();
    createCustomerNoteHistory.restore();
  });

  it('should create customer note', async () => {
    const payload = { title: 'title', description: 'description', customer: new ObjectID() };
    const credentials = { company: { _id: new ObjectID() }, _id: new ObjectID() };
    const customerNote = { _id: new ObjectID(), title: 'title', description: 'description' };

    create.returns(customerNote);

    await CustomerNotesHelper.create(payload, credentials);

    sinon.assert.calledOnceWithExactly(
      createCustomerNoteHistory,
      {
        customerNote: customerNote._id,
        title: payload.title,
        description: payload.description,
        company: credentials.company._id,
        action: NOTE_CREATION,
        createdBy: credentials._id,
      }
    );
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
      { _id: new ObjectID(), title: 'test', histories: [{ title: 'title', description: 'description' }] },
      { _id: new ObjectID(), title: 'test 2' },
    ];

    find.returns(SinonMongoose.stubChainedQueries([customerNotes], ['populate', 'sort', 'lean']));

    const result = await CustomerNotesHelper.list(customer, credentials);

    expect(result).toMatchObject(customerNotes);
    SinonMongoose.calledWithExactly(
      find,
      [
        { query: 'find', args: [{ customer, company: credentials.company._id }] },
        {
          query: 'populate',
          args: [
            {
              path: 'histories',
              select: 'title description createdBy action createdAt',
              populate: { path: 'createdBy', select: 'identity picture' },
            },
          ],
        },
        { query: 'sort', args: [{ updatedAt: -1 }] },
        { query: 'lean' },
      ]
    );
  });
});

describe('udpate', () => {
  let updateOne;
  beforeEach(() => {
    updateOne = sinon.stub(CustomerNote, 'updateOne');
  });
  afterEach(() => {
    updateOne.restore();
  });

  it('should update customer notes', async () => {
    const customerNoteId = new ObjectID();
    const payload = { title: 'titre', description: 'description' };

    await CustomerNotesHelper.update(customerNoteId, payload);

    sinon.assert.calledOnceWithExactly(
      updateOne,
      { _id: customerNoteId },
      { $set: { title: 'titre', description: 'description' } }
    );
  });
});
