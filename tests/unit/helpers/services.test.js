const sinon = require('sinon');
const { ObjectID } = require('mongodb');
const Service = require('../../../src/models/Service');
const ServiceHelper = require('../../../src/helpers/services');

describe('update', () => {
  let updateOne;

  beforeEach(() => {
    updateOne = sinon.stub(Service, 'updateOne');
  });

  afterEach(() => {
    updateOne.restore();
  });

  it('should update a service', async () => {
    const serviceId = new ObjectID();

    await ServiceHelper.update(serviceId, { vat: 2 });

    sinon.assert.calledOnceWithExactly(updateOne, { _id: serviceId }, { $push: { versions: { vat: 2 } } });
  });

  it('should archive a service', async () => {
    const serviceId = new ObjectID();

    await ServiceHelper.update(serviceId, { isArchived: true });

    sinon.assert.calledOnceWithExactly(updateOne, { _id: serviceId }, { isArchived: true });
  });
});
