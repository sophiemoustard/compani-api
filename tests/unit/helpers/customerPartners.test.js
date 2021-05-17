const sinon = require('sinon');
const expect = require('expect');
const { ObjectID } = require('mongodb');
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
    const payload = { partner: new ObjectID(), customer: new ObjectID() };
    const credentials = { company: { _id: new ObjectID() } };
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
    const customer = new ObjectID();
    const credentials = { company: { _id: new ObjectID() } };
    const customerPartners = [
      { _id: new ObjectID(), partner: { _id: new ObjectID() } },
      { _id: new ObjectID(), partner: { _id: new ObjectID() } },
    ];

    find.returns(SinonMongoose.stubChainedQueries([customerPartners]));

    const result = await CustomerPartnersHelper.list(customer, credentials);

    expect(result).toMatchObject(customerPartners);
    SinonMongoose.calledWithExactly(
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
    const customerPartnerId = new ObjectID();
    const customerPartner = { _id: customerPartnerId, customer: new ObjectID() };

    findOneAndUpdate.returns(SinonMongoose.stubChainedQueries([customerPartner], ['lean']));

    await CustomerPartnersHelper.update(customerPartnerId, { prescriber: true });

    SinonMongoose.calledWithExactly(
      findOneAndUpdate,
      [
        {
          query: 'findOneAndUpdate',
          args: [{ _id: customerPartnerId }, { $set: { prescriber: true } }, { fields: { customer: 1 } }],
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
    const customerPartnerId = new ObjectID();
    const customerPartner = { _id: customerPartnerId, customer: new ObjectID() };

    findOneAndUpdate.returns(SinonMongoose.stubChainedQueries([customerPartner], ['lean']));

    await CustomerPartnersHelper.update(customerPartnerId, { prescriber: false });

    sinon.assert.notCalled(updateOne);
    SinonMongoose.calledWithExactly(
      findOneAndUpdate,
      [
        {
          query: 'findOneAndUpdate',
          args: [{ _id: customerPartnerId }, { $set: { prescriber: false } }, { fields: { customer: 1 } }],
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
    const customerPartnerId = new ObjectID();

    await CustomerPartnersHelper.remove(customerPartnerId);

    sinon.assert.calledOnceWithExactly(deleteOne, { _id: customerPartnerId });
  });
});
