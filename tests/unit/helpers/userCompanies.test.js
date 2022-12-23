const { ObjectId } = require('mongodb');
const { expect } = require('expect');
const sinon = require('sinon');
const SinonMongoose = require('../sinonMongoose');
const UtilsMock = require('../../utilsMock');
const UserCompany = require('../../../src/models/UserCompany');
const UserCompaniesHelper = require('../../../src/helpers/userCompanies');
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

  it('should create UserCompany, WITH startDate in payload', async () => {
    const userId = new ObjectId();
    const companyId = new ObjectId();
    const startDate = '2022-12-13T14:15:00.000Z';
    const userCompanyStartDate = '2022-12-12T23:00:00.000Z';

    findOne.returns(SinonMongoose.stubChainedQueries(null, ['lean']));

    await UserCompaniesHelper.create({ user: userId, company: companyId, startDate });

    sinon.assert.calledOnceWithExactly(create, { user: userId, company: companyId, startDate: userCompanyStartDate });
    sinon.assert.calledOnceWithExactly(deleteManyCompanyLinkRequest, { user: userId });
    SinonMongoose.calledOnceWithExactly(
      findOne,
      [
        {
          query: 'findOne',
          args: [
            { user: userId, $or: [{ endDate: { $exists: false } }, { endDate: { $gt: userCompanyStartDate } }] },
            { endDate: 1 },
          ],
        },
        { query: 'lean' },
      ]
    );
  });

  it('should create UserCompany WITHOUT startDate in payload', async () => {
    UtilsMock.mockCurrentDate('2020-12-10T10:11:12.134Z');
    const userId = new ObjectId();
    const companyId = new ObjectId();

    findOne.returns(SinonMongoose.stubChainedQueries(null, ['lean']));

    await UserCompaniesHelper.create({ user: userId, company: companyId });

    sinon.assert.calledOnceWithExactly(
      create,
      { user: userId, company: companyId, startDate: '2020-12-09T23:00:00.000Z' }
    );
    sinon.assert.calledOnceWithExactly(deleteManyCompanyLinkRequest, { user: userId });
    SinonMongoose.calledOnceWithExactly(
      findOne,
      [
        {
          query: 'findOne',
          args: [
            { user: userId, $or: [{ endDate: { $exists: false } }, { endDate: { $gt: '2020-12-09T23:00:00.000Z' } }] },
            { endDate: 1 },
          ],
        },
        { query: 'lean' },
      ]
    );
    UtilsMock.unmockCurrentDate();
  });

  it('should throw an error if user is currently attached to a company (same or other) WITH future endDate',
    async () => {
      const user = new ObjectId();
      const company = new ObjectId();
      const startDate = '2020-12-12T23:00:00.000Z';
      const endDate = '2021-08-11T21:59:59.999Z';

      try {
        findOne.returns(SinonMongoose.stubChainedQueries(
          { user, company: new ObjectId(), startDate, endDate },
          ['lean']
        ));

        await UserCompaniesHelper.create({ user, company, startDate });

        expect(true).toBe(false);
      } catch (e) {
        expect(e.output.payload.statusCode).toEqual(409);
        expect(e.output.payload.message).toEqual('Ce compte est déjà rattaché à une structure jusqu\'au 11/08/2021.');
      }

      sinon.assert.notCalled(create);
      sinon.assert.notCalled(deleteManyCompanyLinkRequest);
      SinonMongoose.calledOnceWithExactly(
        findOne,
        [
          {
            query: 'findOne',
            args: [
              {
                user,
                $or: [{ endDate: { $exists: false } }, { endDate: { $gt: '2020-12-12T23:00:00.000Z' } }],
              },
              { endDate: 1 },
            ],
          },
          { query: 'lean' },
        ]
      );
    });

  it('should throw an error if user is currently attached to a company (same or other) WITHOUT endDate', async () => {
    const user = new ObjectId();
    const company = new ObjectId();
    const startDate = '2020-12-12T23:00:00.000Z';

    try {
      findOne.returns(SinonMongoose.stubChainedQueries({ user, company: new ObjectId(), startDate }, ['lean']));

      await UserCompaniesHelper.create({ user, company, startDate });

      expect(true).toBe(false);
    } catch (e) {
      expect(e.output.payload.statusCode).toEqual(409);
      expect(e.output.payload.message).toEqual('Ce compte est déjà rattaché à une structure.');
    }

    sinon.assert.notCalled(create);
    sinon.assert.notCalled(deleteManyCompanyLinkRequest);
    SinonMongoose.calledOnceWithExactly(
      findOne,
      [
        {
          query: 'findOne',
          args: [
            {
              user,
              $or: [{ endDate: { $exists: false } }, { endDate: { $gt: '2020-12-12T23:00:00.000Z' } }],
            },
            { endDate: 1 },
          ],
        },
        { query: 'lean' },
      ]
    );
  });
});

describe('update', () => {
  let updateOne;

  beforeEach(() => {
    updateOne = sinon.stub(UserCompany, 'updateOne');
  });

  afterEach(() => {
    updateOne.restore();
  });

  it('should update userCompany', async () => {
    const userCompany = { _id: new ObjectId(), company: new ObjectId(), startDate: '2021-12-17T00:00:00.000Z' };

    await UserCompaniesHelper.update(userCompany._id, { endDate: '2022-12-17T00:00:00.000Z' });

    sinon.assert.calledOnceWithExactly(
      updateOne,
      { _id: userCompany._id },
      { $set: { endDate: '2022-12-17T22:59:59.999Z' } }
    );
  });
});
