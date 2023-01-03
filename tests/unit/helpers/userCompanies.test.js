const { ObjectId } = require('mongodb');
const Boom = require('@hapi/boom');
const { expect } = require('expect');
const sinon = require('sinon');
const UserCompany = require('../../../src/models/UserCompany');
const UserCompaniesHelper = require('../../../src/helpers/userCompanies');
const SinonMongoose = require('../sinonMongoose');
const CompanyLinkRequest = require('../../../src/models/CompanyLinkRequest');

describe('create', () => {
  let findOne;
  let create;
  let deleteManyCompanyLinkRequest;

  beforeEach(() => {
    create = sinon.stub(UserCompany, 'create');
    findOne = sinon.stub(UserCompany, 'findOne');
    deleteManyCompanyLinkRequest = sinon.stub(CompanyLinkRequest, 'deleteMany');
  });

  afterEach(() => {
    create.restore();
    findOne.restore();
    deleteManyCompanyLinkRequest.restore();
  });

  it('should create UserCompany WITH startDate', async () => {
    const userId = new ObjectId();
    const companyId = new ObjectId();
    const startDate = '2022-12-13T14:15:00.000Z';

    findOne.returns(SinonMongoose.stubChainedQueries(null, ['lean']));

    await UserCompaniesHelper.create({ user: userId, company: companyId, startDate });

    sinon.assert.calledOnceWithExactly(create, { user: userId, company: companyId, startDate });
    sinon.assert.calledOnceWithExactly(deleteManyCompanyLinkRequest, { user: userId });
    SinonMongoose.calledOnceWithExactly(
      findOne,
      [{ query: 'findOne', args: [{ user: userId }, { company: 1 }] }, { query: 'lean' }]
    );
  });

  it('should create UserCompany WITHOUT specified startDate', async () => {
    const userId = new ObjectId();
    const companyId = new ObjectId();

    findOne.returns(SinonMongoose.stubChainedQueries(null, ['lean']));

    await UserCompaniesHelper.create({ user: userId, company: companyId });

    sinon.assert.calledOnceWithExactly(create, { user: userId, company: companyId });
    sinon.assert.calledOnceWithExactly(deleteManyCompanyLinkRequest, { user: userId });
    SinonMongoose.calledOnceWithExactly(
      findOne,
      [{ query: 'findOne', args: [{ user: userId }, { company: 1 }] }, { query: 'lean' }]
    );
  });

  it('should do nothing if already userCompany for this user and this company', async () => {
    const userId = new ObjectId();
    const companyId = new ObjectId();

    findOne.returns(SinonMongoose.stubChainedQueries({ user: userId, company: companyId }, ['lean']));

    await UserCompaniesHelper.create({ user: userId, company: companyId });

    sinon.assert.notCalled(create);
    sinon.assert.notCalled(deleteManyCompanyLinkRequest);
    SinonMongoose.calledOnceWithExactly(
      findOne,
      [{ query: 'findOne', args: [{ user: userId }, { company: 1 }] }, { query: 'lean' }]
    );
  });

  it('should throw an error if already userCompany for this user and an other company', async () => {
    const userId = new ObjectId();
    const companyId = new ObjectId();

    try {
      findOne.returns(SinonMongoose.stubChainedQueries({ user: userId, company: new ObjectId() }, ['lean']));

      await UserCompaniesHelper.create({ user: userId, company: companyId });

      expect(true).toBe(false);
    } catch (e) {
      expect(e).toEqual(Boom.conflict());
      sinon.assert.notCalled(create);
      sinon.assert.notCalled(deleteManyCompanyLinkRequest);
      SinonMongoose.calledOnceWithExactly(
        findOne,
        [{ query: 'findOne', args: [{ user: userId }, { company: 1 }] }, { query: 'lean' }]
      );
    }
  });
});
