const { ObjectId } = require('mongodb');
const { expect } = require('expect');
const sinon = require('sinon');
const SinonMongoose = require('../sinonMongoose');
const UtilsMock = require('../../utilsMock');
const UserCompany = require('../../../src/models/UserCompany');
const UserCompaniesHelper = require('../../../src/helpers/userCompanies');
const CompanyLinkRequest = require('../../../src/models/CompanyLinkRequest');
const { CompaniDate } = require('../../../src/helpers/dates/companiDates');

describe('create', () => {
  let find;
  let create;
  let deleteManyCompanyLinkRequest;

  beforeEach(() => {
    create = sinon.stub(UserCompany, 'create');
    find = sinon.stub(UserCompany, 'find');
    deleteManyCompanyLinkRequest = sinon.stub(CompanyLinkRequest, 'deleteMany');
  });

  afterEach(() => {
    create.restore();
    find.restore();
    deleteManyCompanyLinkRequest.restore();
  });

  it('should create UserCompany, WITH startDate in payload', async () => {
    const userId = new ObjectId();
    const companyId = new ObjectId();
    const startDate = '2022-12-13T14:15:00.000Z';
    const userCompanyStartDate = '2022-12-12T23:00:00.000Z';

    find.returns(SinonMongoose.stubChainedQueries([], ['sort', 'limit', 'lean']));

    await UserCompaniesHelper.create({ user: userId, company: companyId, startDate });

    sinon.assert.calledOnceWithExactly(create, { user: userId, company: companyId, startDate: userCompanyStartDate });
    sinon.assert.calledOnceWithExactly(deleteManyCompanyLinkRequest, { user: userId });
    SinonMongoose.calledOnceWithExactly(
      find,
      [
        {
          query: 'find',
          args: [
            { user: userId, $or: [{ endDate: { $exists: false } }, { endDate: { $gt: userCompanyStartDate } }] },
            { endDate: 1 },
          ],
        },
        { query: 'sort', args: [{ startDate: -1 }] },
        { query: 'limit', args: [1] },
        { query: 'lean' },
      ]
    );
  });

  it('should create UserCompany WITHOUT startDate in payload', async () => {
    UtilsMock.mockCurrentDate('2020-12-10T10:11:12.134Z');
    const userId = new ObjectId();
    const companyId = new ObjectId();

    find.returns(SinonMongoose.stubChainedQueries([], ['sort', 'limit', 'lean']));

    await UserCompaniesHelper.create({ user: userId, company: companyId });

    sinon.assert.calledOnceWithExactly(
      create,
      { user: userId, company: companyId, startDate: '2020-12-09T23:00:00.000Z' }
    );
    sinon.assert.calledOnceWithExactly(deleteManyCompanyLinkRequest, { user: userId });
    SinonMongoose.calledOnceWithExactly(
      find,
      [
        {
          query: 'find',
          args: [
            { user: userId, $or: [{ endDate: { $exists: false } }, { endDate: { $gt: '2020-12-09T23:00:00.000Z' } }] },
            { endDate: 1 },
          ],
        },
        { query: 'sort', args: [{ startDate: -1 }] },
        { query: 'limit', args: [1] },
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
        find.returns(SinonMongoose.stubChainedQueries(
          [{ user, company: new ObjectId(), startDate, endDate }],
          ['sort', 'limit', 'lean']
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
        find,
        [
          {
            query: 'find',
            args: [
              {
                user,
                $or: [{ endDate: { $exists: false } }, { endDate: { $gt: '2020-12-12T23:00:00.000Z' } }],
              },
              { endDate: 1 },
            ],
          },
          { query: 'sort', args: [{ startDate: -1 }] },
          { query: 'limit', args: [1] },
          { query: 'lean' },
        ]
      );
    });

  it('should throw an error if user is currently attached to a company (same or other) WITHOUT endDate', async () => {
    const user = new ObjectId();
    const company = new ObjectId();
    const startDate = '2020-12-12T23:00:00.000Z';

    try {
      find.returns(
        SinonMongoose.stubChainedQueries([{ user, company: new ObjectId(), startDate }], ['sort', 'limit', 'lean'])
      );

      await UserCompaniesHelper.create({ user, company, startDate });

      expect(true).toBe(false);
    } catch (e) {
      expect(e.output.payload.statusCode).toEqual(409);
      expect(e.output.payload.message).toEqual('Ce compte est déjà rattaché à une structure.');
    }

    sinon.assert.notCalled(create);
    sinon.assert.notCalled(deleteManyCompanyLinkRequest);
    SinonMongoose.calledOnceWithExactly(
      find,
      [
        {
          query: 'find',
          args: [
            {
              user,
              $or: [{ endDate: { $exists: false } }, { endDate: { $gt: '2020-12-12T23:00:00.000Z' } }],
            },
            { endDate: 1 },
          ],
        },
        { query: 'sort', args: [{ startDate: -1 }] },
        { query: 'limit', args: [1] },
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

describe('userIsOrWillBeInCompany', () => {
  const user = new ObjectId();
  const company = new ObjectId();

  it('should return true if some of user companies are active with good company (without endDate)', async () => {
    const userCompanies = [
      { user, company: new ObjectId(), startDate: '2021-10-25T23:59:59.999Z', endDate: '2022-10-25T23:59:59.999Z' },
      { user, company, startDate: '2022-10-26T00:00:00.000Z' },
    ];

    const res = await UserCompaniesHelper.userIsOrWillBeInCompany(userCompanies, company);
    expect(res).toBe(true);
  });

  it('should return true if some of user companies are active with good company (with endDate)', async () => {
    const userCompanies = [
      { user, company: new ObjectId(), startDate: '2021-10-25T23:59:59.999Z', endDate: '2022-10-25T23:59:59.999Z' },
      { user, company, startDate: '2022-10-26T00:00:00.000Z', endDate: CompaniDate().add('P1D').toISO() },
    ];

    const res = await UserCompaniesHelper.userIsOrWillBeInCompany(userCompanies, company);
    expect(res).toBe(true);
  });

  it('should return true if some of user companies are in the future with good company', async () => {
    const userCompanies = [
      { user, company: new ObjectId(), startDate: '2021-10-25T23:59:59.999Z', endDate: '2022-10-25T23:59:59.999Z' },
      { user, company, startDate: CompaniDate().add('P1D').toISO() },
    ];

    const res = await UserCompaniesHelper.userIsOrWillBeInCompany(userCompanies, company);
    expect(res).toBe(true);
  });

  it('should return false if none of user companies are active or in the future', async () => {
    const userCompanies = [
      { user, company: new ObjectId(), startDate: '2021-10-25T23:59:59.999Z', endDate: '2022-10-25T23:59:59.999Z' },
      { user, company, startDate: '2022-10-26T00:00:00.000Z', endDate: '2022-10-28T00:00:00.000Z' },
    ];

    const res = await UserCompaniesHelper.userIsOrWillBeInCompany(userCompanies, company);
    expect(res).toBe(false);
  });

  it('should return false if some of user companies are active but with wrong company', async () => {
    const userCompanies = [
      { user, company: new ObjectId(), startDate: '2021-10-25T23:59:59.999Z', endDate: '2022-10-25T23:59:59.999Z' },
      { user, company: new ObjectId(), startDate: '2022-10-26T00:00:00.000Z' },
    ];

    const res = await UserCompaniesHelper.userIsOrWillBeInCompany(userCompanies, company);
    expect(res).toBe(false);
  });
});

describe('getCurrentAndFutureCompanies', () => {
  it('should return active and future companies', async () => {
    const user = new ObjectId();
    const authCompany = new ObjectId();
    const otherCompany = new ObjectId();
    const userCompanies = [
      { user, company: new ObjectId(), startDate: '2021-10-25T23:59:59.999Z', endDate: '2022-10-25T23:59:59.999Z' },
      { user, company: authCompany, startDate: '2022-10-26T00:00:00.000Z', endDate: CompaniDate().add('P1D').toISO() },
      { user, company: otherCompany, startDate: CompaniDate().add('P2D').toISO() },
    ];

    const res = await UserCompaniesHelper.getCurrentAndFutureCompanies(userCompanies);
    expect(res).toEqual([authCompany, otherCompany]);
  });
});
