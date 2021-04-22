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
    const newCustomerPartner = { partner: new ObjectID(), customer: new ObjectID() };
    const company = new ObjectID();
    await CustomerPartnersHelper.createCustomerPartner(newCustomerPartner, { company });

    sinon.assert.calledOnceWithExactly(create, { ...newCustomerPartner, company });
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
    const customerPartnersList = [{ _id: new ObjectID() }, { _id: new ObjectID() }];

    find.returns(SinonMongoose.stubChainedQueries([customerPartnersList]));

    const result = await CustomerPartnersHelper.list(customer);

    expect(result).toMatchObject(customerPartnersList);
    SinonMongoose.calledWithExactly(
      find,
      [
        { query: 'find', args: [{ customer }] },
        { query: 'populate', args: [{ path: 'partner', select: '-__v -createdAt -updatedAt' }] },
        { query: 'lean' },
      ]
    );
  });

  it('should return an empty array if no partners associated to this customer', async () => {
    const customer = new ObjectID();

    find.returns(SinonMongoose.stubChainedQueries([[]]));

    const result = await CustomerPartnersHelper.list(customer);

    expect(result).toMatchObject([]);
    SinonMongoose.calledWithExactly(
      find,
      [
        { query: 'find', args: [{ customer }] },
        { query: 'populate', args: [{ path: 'partner', select: '-__v -createdAt -updatedAt' }] },
        { query: 'lean' },
      ]
    );
  });
});
