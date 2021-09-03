const sinon = require('sinon');
const { ObjectID } = require('mongodb');
const CompanyLinkRequest = require('../../../src/models/CompanyLinkRequest');
const CompanyLinkRequestsHelper = require('../../../src/helpers/companyLinkRequests');

describe('create', () => {
  let create;
  beforeEach(() => {
    create = sinon.stub(CompanyLinkRequest, 'create');
  });
  afterEach(() => {
    create.restore();
  });

  it('should create a company link request', async () => {
    const credentials = { _id: new ObjectID() };
    const payload = { company: new ObjectID() };

    await CompanyLinkRequestsHelper.create(payload, credentials);

    sinon.assert.calledOnceWithExactly(create, { user: credentials._id, company: payload.company });
  });
});
