const sinon = require('sinon');
const Holding = require('../../../src/models/Holding');
const HoldingHelper = require('../../../src/helpers/holdings');

describe('create', () => {
  let create;
  beforeEach(() => {
    create = sinon.stub(Holding, 'create');
  });
  afterEach(() => {
    create.restore();
  });

  it('should create a holding', async () => {
    const payload = {
      name: 'Test SAS',
      address: {
        fullAddress: '24 avenue Daumesnil 75012 Paris',
        street: '24 avenue Daumesnil',
        zipCode: '75012',
        city: 'Paris',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
    };

    await HoldingHelper.create(payload);

    sinon.assert.calledOnceWithExactly(create, payload);
  });
});
