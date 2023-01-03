const sinon = require('sinon');
const { expect } = require('expect');
const { ObjectId } = require('mongodb');
const CustomerPartner = require('../../../src/models/CustomerPartner');
const CustomerPartnersHelper = require('../../../src/helpers/customerPartners');
const SinonMongoose = require('../sinonMongoose');

describe('createCustomerPartner', () => {
  let create;
  beforeEach(() => {
    create = sinon.stub(CustomerPartner, 'create');
  });
  afterEach(() => {
    create.restore();
  });

  it('should create customer partner', async () => {
    const payload = { partner: new ObjectId(), customer: new ObjectId() };
    const credentials = { company: { _id: new ObjectId() } };
    await CustomerPartnersHelper.createCustomerPartner(payload, credentials);

    sinon.assert.calledOnceWithExactly(create, { ...payload, company: credentials.company._id });
  });
});

describe('list', () => {
  let find;
  beforeEach(() => {
    find = sinon.stub(CustomerPartner, 'find');
  });
  afterEach(() => {
    find.restore();
  });

  it('should return customer partners', async () => {
    const customer = new ObjectId();
    const credentials = { company: { _id: new ObjectId() } };
    const customerPartners = [
      { _id: new ObjectId(), partner: { _id: new ObjectId() } },
      { _id: new ObjectId(), partner: { _id: new ObjectId() } },
    ];

    find.returns(SinonMongoose.stubChainedQueries(customerPartners));

    const result = await CustomerPartnersHelper.list(customer, credentials);

    expect(result).toMatchObject(customerPartners);
    SinonMongoose.calledOnceWithExactly(
      find,
      [
        { query: 'find', args: [{ customer, company: credentials.company._id }] },
        {
          query: 'populate',
          args: [{
            path: 'partner',
            select: '-__v -createdAt -updatedAt',
            populate: { path: 'partnerOrganization', select: 'name' },
          }],
        },
        { query: 'lean' },
      ]
    );
  });
});

describe('update', () => {
  let findOneAndUpdate;
  let updateOne;
  beforeEach(() => {
    findOneAndUpdate = sinon.stub(CustomerPartner, 'findOneAndUpdate');
    updateOne = sinon.stub(CustomerPartner, 'updateOne');
  });
  afterEach(() => {
    findOneAndUpdate.restore();
    updateOne.restore();
  });

  it('should update the prescriber partner', async () => {
    const customerPartnerId = new ObjectId();
    const customerPartner = { _id: customerPartnerId, customer: new ObjectId() };

    findOneAndUpdate.returns(SinonMongoose.stubChainedQueries(customerPartner, ['lean']));

    await CustomerPartnersHelper.update(customerPartnerId, { prescriber: true });

    SinonMongoose.calledOnceWithExactly(
      findOneAndUpdate,
      [
        {
          query: 'findOneAndUpdate',
          args: [{ _id: customerPartnerId }, { $set: { prescriber: true } }, { projection: { customer: 1 } }],
        },
        { query: 'lean' },
      ]
    );
    sinon.assert.calledOnceWithExactly(
      updateOne,
      { _id: { $ne: customerPartnerId }, customer: customerPartner.customer, prescriber: true },
      { $set: { prescriber: false } }
    );
  });
  it('should remove the prescriber partner', async () => {
    const customerPartnerId = new ObjectId();
    const customerPartner = { _id: customerPartnerId, customer: new ObjectId() };

    findOneAndUpdate.returns(SinonMongoose.stubChainedQueries(customerPartner, ['lean']));

    await CustomerPartnersHelper.update(customerPartnerId, { prescriber: false });

    sinon.assert.notCalled(updateOne);
    SinonMongoose.calledOnceWithExactly(
      findOneAndUpdate,
      [
        {
          query: 'findOneAndUpdate',
          args: [{ _id: customerPartnerId }, { $set: { prescriber: false } }, { projection: { customer: 1 } }],
        },
        { query: 'lean' },
      ]
    );
  });
});

describe('remove', () => {
  let deleteOne;
  beforeEach(() => {
    deleteOne = sinon.stub(CustomerPartner, 'deleteOne');
  });
  afterEach(() => {
    deleteOne.restore();
  });

  it('should delete a customer partner', async () => {
    const customerPartnerId = new ObjectId();

    await CustomerPartnersHelper.remove(customerPartnerId);

    sinon.assert.calledOnceWithExactly(deleteOne, { _id: customerPartnerId });
  });
});
