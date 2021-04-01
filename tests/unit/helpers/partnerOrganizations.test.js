const sinon = require('sinon');
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

    await PartnerOrganizationsHelper.create(payload);

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
      }
    );
  });
});
