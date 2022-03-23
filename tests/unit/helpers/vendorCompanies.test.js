const sinon = require('sinon');
const { ObjectId } = require('mongodb');
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
    const credentials = { role: { vendor: new ObjectId() } };

    findOne.returns(SinonMongoose.stubChainedQueries(VendorCompany, ['lean']));

    await VendorCompaniesHelper.get(credentials);

    SinonMongoose.calledOnceWithExactly(findOne, [{ query: 'findOne', args: [] }, { query: 'lean' }]);
  });
});
