const sinon = require('sinon');
const { ObjectID } = require('mongodb');
const PartnerOrganization = require('../../../src/models/PartnerOrganization');
const PartnerOrganizationsHelper = require('../../../src/helpers/partnerOrganizations');

describe('create', () => {
  let create;
  beforeEach(() => {
    create = sinon.stub(PartnerOrganization, 'create');
  });
  afterEach(() => {
    create.restore();
  });

  it('should create partner organization', async () => {
    const credentials = { company: { _id: new ObjectID() } };
    const payload = {
      name: 'Etchebest Corporation',
      phone: '0123456789',
      email: 'sku@alenvi.io',
      address: {
        fullAddress: '24 avenue Daumesnil 75012 Paris',
        zipCode: '75012',
        city: 'Paris',
        street: '24 avenue Daumesnil',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
    };

    await PartnerOrganizationsHelper.create(payload, credentials);

    sinon.assert.calledOnceWithExactly(
      create,
      {
        name: 'Etchebest Corporation',
        phone: '0123456789',
        email: 'sku@alenvi.io',
        address: {
          fullAddress: '24 avenue Daumesnil 75012 Paris',
          zipCode: '75012',
          city: 'Paris',
          street: '24 avenue Daumesnil',
          location: { type: 'Point', coordinates: [2.377133, 48.801389] },
        },
        company: credentials.company._id,
      }
    );
  });
});

describe('list', () => {
  let find;
  beforeEach(() => {
    find = sinon.stub(PartnerOrganization, 'find');
  });
  afterEach(() => {
    find.restore();
  });

  it('should list partner organizations from my company', async () => {
    const credentials = { company: { _id: new ObjectID() } };

    await PartnerOrganizationsHelper.list(credentials);

    sinon.assert.calledOnceWithExactly(find, { company: credentials.company._id });
  });
});
