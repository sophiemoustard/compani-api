const sinon = require('sinon');
const { ObjectID } = require('mongodb');
const CustomerPartner = require('../../../src/models/CustomerPartner');
const CustomerPartnersHelper = require('../../../src/helpers/customerPartners');

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
