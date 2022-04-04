const sinon = require('sinon');
const VendorCompany = require('../../../src/models/VendorCompany');
const VendorCompaniesHelper = require('../../../src/helpers/vendorCompanies');
const SinonMongoose = require('../sinonMongoose');

describe('get', () => {
  let findOne;

  beforeEach(() => {
    findOne = sinon.stub(VendorCompany, 'findOne');
  });

  afterEach(() => {
    findOne.restore();
  });

  it('should return vendor company infos', async () => {
    findOne.returns(SinonMongoose.stubChainedQueries(VendorCompany, ['lean']));

    await VendorCompaniesHelper.get();

    SinonMongoose.calledOnceWithExactly(findOne, [{ query: 'findOne', args: [] }, { query: 'lean' }]);
  });
});

describe('update', () => {
  let updateOne;

  beforeEach(() => {
    updateOne = sinon.stub(VendorCompany, 'updateOne');
  });

  afterEach(() => {
    updateOne.restore();
  });

  it('should update vendor company infos', async () => {
    const payload = { name: 'Campanil' };

    await VendorCompaniesHelper.update(payload);

    sinon.assert.calledOnceWithExactly(updateOne, {}, { $set: payload });
  });
});
