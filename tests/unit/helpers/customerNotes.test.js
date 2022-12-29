const sinon = require('sinon');
const { expect } = require('expect');
const { ObjectId } = require('mongodb');
const CustomerNote = require('../../../src/models/CustomerNote');
const CustomerNoteHistory = require('../../../src/models/CustomerNoteHistory');
const CustomerNotesHelper = require('../../../src/helpers/customerNotes');
const SinonMongoose = require('../sinonMongoose');
const { NOTE_CREATION, NOTE_UPDATE } = require('../../../src/helpers/constants');

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
    const payload = { title: 'title', description: 'description', customer: new ObjectId() };
    const credentials = { company: { _id: new ObjectId() }, _id: new ObjectId() };
    const customerNote = { _id: new ObjectId(), title: 'title', description: 'description' };

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
    const customer = new ObjectId();
    const credentials = { company: { _id: new ObjectId() } };
    const customerNotes = [
      { _id: new ObjectId(), title: 'test', histories: [{ title: 'title', description: 'description' }] },
      { _id: new ObjectId(), title: 'test 2' },
    ];

    find.returns(SinonMongoose.stubChainedQueries(customerNotes, ['populate', 'sort', 'lean']));

    const result = await CustomerNotesHelper.list(customer, credentials);

    expect(result).toMatchObject(customerNotes);
    SinonMongoose.calledOnceWithExactly(
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

describe('update', () => {
  let updateOne;
  let findOne;
  let customerNoteHistoryCreate;
  beforeEach(() => {
    updateOne = sinon.stub(CustomerNote, 'updateOne');
    findOne = sinon.stub(CustomerNote, 'findOne');
    customerNoteHistoryCreate = sinon.stub(CustomerNoteHistory, 'create');
  });
  afterEach(() => {
    updateOne.restore();
    findOne.restore();
    customerNoteHistoryCreate.restore();
  });

  it('should update customer note and create an history', async () => {
    const credentials = { company: { _id: new ObjectId() }, _id: new ObjectId() };
    const customerNote = { _id: new ObjectId(), title: 'test', description: 'description', customer: credentials._id };
    const payload = { title: 'titre mis a jour', description: 'description mise a jour' };

    findOne.returns(SinonMongoose.stubChainedQueries(customerNote, ['lean']));
    customerNoteHistoryCreate.returns(customerNote);

    await CustomerNotesHelper.update(customerNote._id, payload, credentials);

    SinonMongoose.calledOnceWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ _id: customerNote._id, company: credentials.company._id }] },
        { query: 'lean' },
      ]
    );
    sinon.assert.calledWithExactly(
      customerNoteHistoryCreate,
      {
        title: 'titre mis a jour',
        customerNote: customerNote._id,
        company: credentials.company._id,
        createdBy: credentials._id,
        action: NOTE_UPDATE,
      }
    );
    sinon.assert.calledWithExactly(
      customerNoteHistoryCreate,
      {
        description: 'description mise a jour',
        customerNote: customerNote._id,
        company: credentials.company._id,
        createdBy: credentials._id,
        action: NOTE_UPDATE,
      }
    );
    sinon.assert.callCount(customerNoteHistoryCreate, 2);
    sinon.assert.calledOnceWithExactly(
      updateOne,
      { _id: customerNote._id, company: credentials.company._id },
      { $set: { title: 'titre mis a jour', description: 'description mise a jour' } }
    );
  });

  it('should not update note or create history if neither description nor title are changed', async () => {
    const credentials = { company: { _id: new ObjectId() }, _id: new ObjectId() };
    const customerNote = {
      _id: new ObjectId(),
      title: 'test',
      description: 'description',
      customer: credentials._id,
    };
    const payload = { title: '  test', description: 'description' };

    findOne.returns(SinonMongoose.stubChainedQueries(customerNote, ['lean']));

    await CustomerNotesHelper.update(customerNote._id, payload, credentials);

    SinonMongoose.calledOnceWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ _id: customerNote._id, company: credentials.company._id }] },
        { query: 'lean' },
      ]
    );
    sinon.assert.notCalled(customerNoteHistoryCreate);
    sinon.assert.notCalled(updateOne);
  });
});
