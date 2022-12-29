const sinon = require('sinon');
const { expect } = require('expect');
const { ObjectId } = require('mongodb');
const CompanyLinkRequest = require('../../../src/models/CompanyLinkRequest');
const CompanyLinkRequestsHelper = require('../../../src/helpers/companyLinkRequests');
const SinonMongoose = require('../sinonMongoose');

describe('create', () => {
  let create;
  beforeEach(() => {
    create = sinon.stub(CompanyLinkRequest, 'create');
  });
  afterEach(() => {
    create.restore();
  });

  it('should create a company link request', async () => {
    const credentials = { _id: new ObjectId() };
    const payload = { company: new ObjectId() };

    await CompanyLinkRequestsHelper.create(payload, credentials);

    sinon.assert.calledOnceWithExactly(create, { user: credentials._id, company: payload.company });
  });
});

describe('list', () => {
  let find;
  beforeEach(() => {
    find = sinon.stub(CompanyLinkRequest, 'find');
  });
  afterEach(() => {
    find.restore();
  });

  it('should get all company link requests', async () => {
    const companyId = new ObjectId();
    const credentials = { company: { _id: companyId } };
    const companyLinkRequestList = [
      { user: new ObjectId(), company: companyId },
      { user: new ObjectId(), company: companyId },
    ];

    find.returns(SinonMongoose.stubChainedQueries(companyLinkRequestList));

    const result = await CompanyLinkRequestsHelper.list(credentials);

    expect(result).toEqual(companyLinkRequestList);

    SinonMongoose.calledOnceWithExactly(
      find,
      [
        { query: 'find', args: [{ company: companyId }] },
        {
          query: 'populate',
          args: [{ path: 'user', select: 'identity.lastname identity.firstname local.email picture' }],
        },
        { query: 'lean' },
      ]
    );
  });
});

describe('removeCompanyLinkRequest', () => {
  let deleteOne;
  beforeEach(() => {
    deleteOne = sinon.stub(CompanyLinkRequest, 'deleteOne');
  });
  afterEach(() => {
    deleteOne.restore();
  });

  it('should remove a company link request', async () => {
    const companyLinkRequestId = new ObjectId();

    await CompanyLinkRequestsHelper.removeCompanyLinkRequest(companyLinkRequestId);

    sinon.assert.calledOnceWithExactly(deleteOne, { _id: companyLinkRequestId });
  });
});
