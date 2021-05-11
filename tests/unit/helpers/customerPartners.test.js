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

    expect(result).toMatchObject(customerPartners.map(customerPartner => customerPartner.partner));
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
