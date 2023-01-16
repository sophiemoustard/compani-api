const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const { expect } = require('expect');
const moment = require('moment');
const sinon = require('sinon');
const Boom = require('@hapi/boom');
const flat = require('flat');
const omit = require('lodash/omit');
const get = require('lodash/get');
const SinonMongoose = require('../sinonMongoose');
const UtilsMock = require('../../utilsMock');
const UsersHelper = require('../../../src/helpers/users');
const SectorHistoriesHelper = require('../../../src/helpers/sectorHistories');
const translate = require('../../../src/helpers/translate');
const GDriveStorageHelper = require('../../../src/helpers/gDriveStorage');
const GCloudStorageHelper = require('../../../src/helpers/gCloudStorage');
const HelpersHelper = require('../../../src/helpers/helpers');
const UserCompaniesHelper = require('../../../src/helpers/userCompanies');
const User = require('../../../src/models/User');
const Contract = require('../../../src/models/Contract');
const Course = require('../../../src/models/Course');
const CompanyLinkRequest = require('../../../src/models/CompanyLinkRequest');
const Role = require('../../../src/models/Role');
const UserCompany = require('../../../src/models/UserCompany');
const { HELPER, AUXILIARY_WITHOUT_COMPANY, WEBAPP } = require('../../../src/helpers/constants');
const ActivityHistory = require('../../../src/models/ActivityHistory');
const { CompaniDate } = require('../../../src/helpers/dates/companiDates');

const { language } = translate;

describe('formatQueryForUsersList', () => {
  let find;
  let findUserCompany;
  const credentials = { company: { _id: new ObjectId() }, _id: new ObjectId() };
  const companyId = credentials.company._id;

  beforeEach(() => {
    find = sinon.stub(Role, 'find');
    findUserCompany = sinon.stub(UserCompany, 'find');
  });

  afterEach(() => {
    find.restore();
    findUserCompany.restore();
  });

  it('should returns params without role if no role in query', async () => {
    const users = [{ _id: new ObjectId(), user: new ObjectId() }];
    const query = { company: companyId, _id: { $in: users.map(u => u.user) } };

    findUserCompany.returns(SinonMongoose.stubChainedQueries(users, ['lean']));

    const result = await UsersHelper.formatQueryForUsersList(query);

    expect(result).toEqual(omit(query, 'company'));
    sinon.assert.notCalled(find);
    SinonMongoose.calledOnceWithExactly(
      findUserCompany,
      [{ query: 'find', args: [{ company: companyId }, { user: 1 }] }, { query: 'lean' }]
    );
  });

  it('should return params with role', async () => {
    const users = [{ _id: new ObjectId(), user: new ObjectId() }];
    const query = {
      company: companyId,
      _id: { $in: users.map(u => u.user) },
      role: [{ _id: new ObjectId() }, { _id: new ObjectId() }],
    };
    const roles = [{ _id: query.role[0]._id, interface: 'vendor' }, { _id: query.role[1]._id, interface: 'vendor' }];

    find.returns(SinonMongoose.stubChainedQueries(roles, ['lean']));
    findUserCompany.returns(SinonMongoose.stubChainedQueries(users, ['lean']));

    const result = await UsersHelper.formatQueryForUsersList(query);
    expect(result).toEqual({
      _id: { $in: users.map(u => u.user) },
      'role.vendor': { $in: [query.role[0]._id, query.role[1]._id] },
    });

    SinonMongoose.calledOnceWithExactly(
      find,
      [{ query: 'find', args: [{ name: { $in: query.role } }, { _id: 1, interface: 1 }] }, { query: 'lean' }]
    );
    SinonMongoose.calledOnceWithExactly(
      findUserCompany,
      [{ query: 'find', args: [{ company: companyId }, { user: 1 }] }, { query: 'lean' }]
    );
  });

  it('should return 404 if role does not exist', async () => {
    const query = { company: companyId, role: [{ _id: new ObjectId() }, { _id: new ObjectId() }] };
    try {
      find.returns(SinonMongoose.stubChainedQueries([], ['lean']));

      const result = await UsersHelper.formatQueryForUsersList(query);
      expect(result).toBeUndefined();
    } catch (e) {
      expect(e).toEqual(Boom.notFound(translate[language].roleNotFound));
    } finally {
      SinonMongoose.calledOnceWithExactly(
        find,
        [{ query: 'find', args: [{ name: { $in: query.role } }, { _id: 1, interface: 1 }] }, { query: 'lean' }]
      );
    }
  });
});

describe('getUsersList', () => {
  let formatQueryForUsersListStub;
  let find;
  const users = [{ _id: new ObjectId() }, { _id: new ObjectId() }];
  const credentials = { company: { _id: new ObjectId() }, _id: new ObjectId() };
  const companyId = credentials.company._id;

  beforeEach(() => {
    formatQueryForUsersListStub = sinon.stub(UsersHelper, 'formatQueryForUsersList');
    find = sinon.stub(User, 'find');
  });

  afterEach(() => {
    formatQueryForUsersListStub.restore();
    find.restore();
  });

  it('should get users', async () => {
    const query = { email: 'toto@test.com', company: companyId };

    formatQueryForUsersListStub.returns(query);

    find.returns(SinonMongoose.stubChainedQueries(users, ['populate', 'setOptions', 'lean']));

    const result = await UsersHelper.getUsersList(query, { ...credentials, role: { client: 'test' } });

    expect(result).toEqual(users);
    sinon.assert.calledOnceWithExactly(formatQueryForUsersListStub, query);
    SinonMongoose.calledOnceWithExactly(
      find,
      [
        { query: 'find', args: [{ ...query, company: companyId }, {}, { autopopulate: false }] },
        { query: 'populate', args: [{ path: 'role.client', select: '-__v -createdAt -updatedAt' }] },
        {
          query: 'populate',
          args: [{ path: 'company', populate: { path: 'company' }, select: '-__v -createdAt -updatedAt' }],
        },
        {
          query: 'populate',
          args: [{
            path: 'sector',
            select: '_id sector',
            match: { company: credentials.company._id },
            options: { isVendorUser: false },
          }],
        },
        { query: 'populate', args: [{ path: 'contracts', select: 'startDate endDate' }] },
        { query: 'setOptions', args: [{ isVendorUser: false }] },
        { query: 'lean', args: [{ virtuals: true, autopopulate: true }] },
      ]
    );
  });

  it('should get users according to roles', async () => {
    const query = { role: ['auxiliary', 'planning_referent'], company: companyId };
    const roles = [new ObjectId(), new ObjectId()];
    const formattedQuery = { company: companyId, 'role.client': { $in: roles } };

    find.returns(SinonMongoose.stubChainedQueries(users, ['populate', 'setOptions', 'lean']));

    formatQueryForUsersListStub.returns(formattedQuery);

    const result = await UsersHelper.getUsersList(query, { ...credentials, role: { client: 'test' } });

    expect(result).toEqual(users);
    sinon.assert.calledOnceWithExactly(formatQueryForUsersListStub, query);
    SinonMongoose.calledOnceWithExactly(
      find,
      [
        { query: 'find', args: [formattedQuery, {}, { autopopulate: false }] },
        { query: 'populate', args: [{ path: 'role.client', select: '-__v -createdAt -updatedAt' }] },
        {
          query: 'populate',
          args: [{ path: 'company', populate: { path: 'company' }, select: '-__v -createdAt -updatedAt' }],
        },
        {
          query: 'populate',
          args: [{
            path: 'sector',
            select: '_id sector',
            match: { company: credentials.company._id },
            options: { isVendorUser: false },
          }],
        },
        { query: 'populate', args: [{ path: 'contracts', select: 'startDate endDate' }] },
        { query: 'setOptions', args: [{ isVendorUser: false }] },
        { query: 'lean', args: [{ virtuals: true, autopopulate: true }] },
      ]
    );
  });
});

describe('getUsersListWithSectorHistories', () => {
  let find;
  let formatQueryForUsersListStub;
  const users = [{ _id: new ObjectId() }, { _id: new ObjectId() }];
  const credentials = { company: { _id: new ObjectId() }, _id: new ObjectId() };
  const companyId = credentials.company._id;

  beforeEach(() => {
    find = sinon.stub(User, 'find');
    formatQueryForUsersListStub = sinon.stub(UsersHelper, 'formatQueryForUsersList');
  });

  afterEach(() => {
    find.restore();
    formatQueryForUsersListStub.restore();
  });

  it('should get users', async () => {
    const query = { company: companyId };
    const roles = [new ObjectId(), new ObjectId()];

    const formattedQuery = {
      company: companyId,
      'role.client': { $in: roles },
    };

    find.returns(SinonMongoose.stubChainedQueries(users, ['populate', 'setOptions', 'lean']));
    formatQueryForUsersListStub.returns(formattedQuery);

    const result = await UsersHelper.getUsersListWithSectorHistories(
      query,
      { ...credentials, role: { client: 'test' } }
    );
    expect(result).toEqual(users);
    sinon.assert.calledOnceWithExactly(
      formatQueryForUsersListStub,
      { ...query, role: ['auxiliary', 'planning_referent', 'auxiliary_without_company'] }
    );
    SinonMongoose.calledOnceWithExactly(
      find,
      [
        { query: 'find', args: [formattedQuery, {}, { autopopulate: false }] },
        { query: 'populate', args: [{ path: 'role.client', select: '-__v -createdAt -updatedAt' }] },
        {
          query: 'populate',
          args: [{ path: 'company', populate: { path: 'company' }, select: '-__v -createdAt -updatedAt' }],
        },
        {
          query: 'populate',
          args: [{
            path: 'sectorHistories',
            select: '_id sector startDate endDate',
            match: { company: credentials.company._id },
            options: { isVendorUser: false },
          }],
        },
        { query: 'populate', args: [{ path: 'contracts', select: 'startDate endDate' }] },
        { query: 'setOptions', args: [{ isVendorUser: false }] },
        { query: 'lean', args: [{ virtuals: true, autopopulate: true }] },
      ]
    );
  });
});

describe('getLearnerList', () => {
  let findUser;
  let findRole;
  let findUserCompany;
  beforeEach(() => {
    findUser = sinon.stub(User, 'find');
    findRole = sinon.stub(Role, 'find');
    findUserCompany = sinon.stub(UserCompany, 'find');
    UtilsMock.mockCurrentDate('2022-12-21T16:00:00.000Z');
  });
  afterEach(() => {
    findUser.restore();
    findRole.restore();
    findUserCompany.restore();
    UtilsMock.unmockCurrentDate();
  });

  it('should get all learners', async () => {
    const query = {};
    const credentials = { role: { vendor: new ObjectId() } };
    const users = [
      { _id: new ObjectId(), activityHistories: [{ _id: new ObjectId() }] },
      { _id: new ObjectId(), activityHistories: [{ _id: new ObjectId() }] },
    ];
    const usersWithVirtuals = [
      { _id: users[0]._id, activityHistoryCount: 1, lastActivityHistory: users[0].activityHistories[0] },
      { _id: users[1]._id, activityHistoryCount: 1, lastActivityHistory: users[1].activityHistories[0] },
    ];

    findUser.returns(SinonMongoose.stubChainedQueries(users, ['populate', 'setOptions', 'lean']));

    const result = await UsersHelper.getLearnerList(query, credentials);

    expect(result).toEqual(usersWithVirtuals);
    sinon.assert.notCalled(findRole);
    sinon.assert.notCalled(findUserCompany);
    SinonMongoose.calledOnceWithExactly(
      findUser,
      [
        {
          query: 'find',
          args: [{}, 'identity.firstname identity.lastname picture local.email', { autopopulate: false }],
        },
        { query: 'populate', args: [{ path: 'company', populate: { path: 'company', select: 'name' } }] },
        { query: 'populate', args: [{ path: 'blendedCoursesCount' }] },
        { query: 'populate', args: [{ path: 'eLearningCoursesCount' }] },
        {
          query: 'populate',
          args: [{ path: 'activityHistories', select: 'updatedAt', options: { sort: { updatedAt: -1 } } }],
        },
        { query: 'setOptions', args: [{ isVendorUser: !!get(credentials, 'role.vendor') }] },
        { query: 'lean' },
      ]
    );
  });

  it('should get learners from company', async () => {
    const query = { companies: [new ObjectId()] };
    const credentials = { role: { client: new ObjectId() } };
    const roleId1 = new ObjectId();
    const roleId2 = new ObjectId();
    const rolesToExclude = [{ _id: roleId1 }, { _id: roleId2 }];
    const users = [
      { _id: new ObjectId(), activityHistories: [{ _id: new ObjectId() }] },
      { _id: new ObjectId(), activityHistories: [{ _id: new ObjectId() }] },
    ];
    const usersCompany = [
      { user: users[0]._id, startDate: '2022-12-20T15:30:00.000Z' },
      { user: users[1]._id, startDate: '2022-12-19T15:30:00.000Z' },
    ];
    const usersWithVirtuals = [
      { _id: users[0]._id, activityHistoryCount: 1, lastActivityHistory: users[0].activityHistories[0] },
      { _id: users[1]._id, activityHistoryCount: 1, lastActivityHistory: users[1].activityHistories[0] },
    ];

    findUserCompany.returns(SinonMongoose.stubChainedQueries(usersCompany, ['lean']));
    findRole.returns(SinonMongoose.stubChainedQueries(rolesToExclude, ['lean']));
    findUser.returns(SinonMongoose.stubChainedQueries(users, ['populate', 'setOptions', 'lean']));

    const result = await UsersHelper.getLearnerList(query, credentials);

    expect(result).toEqual(usersWithVirtuals);
    SinonMongoose.calledOnceWithExactly(
      findRole,
      [{ query: 'find', args: [{ name: { $in: [HELPER, AUXILIARY_WITHOUT_COMPANY] } }] }, { query: 'lean' }]
    );
    SinonMongoose.calledOnceWithExactly(
      findUserCompany,
      [{
        query: 'find',
        args: [
          {
            company: { $in: query.companies },
            startDate: { $lte: CompaniDate('2022-12-21T16:00:00.000Z').toISO() },
            $or: [
              { endDate: { $exists: false } },
              { endDate: { $gte: CompaniDate('2022-12-21T16:00:00.000Z').toISO() } },
            ],
          },
          { user: 1 },
        ],
      }, { query: 'lean' }]
    );
    SinonMongoose.calledOnceWithExactly(
      findUser,
      [
        {
          query: 'find',
          args: [
            { _id: { $in: [users[0]._id, users[1]._id] }, 'role.client': { $not: { $in: [roleId1, roleId2] } } },
            'identity.firstname identity.lastname picture local.email',
            { autopopulate: false },
          ],
        },
        { query: 'populate', args: [{ path: 'company', populate: { path: 'company', select: 'name' } }] },
        { query: 'populate', args: [{ path: 'blendedCoursesCount' }] },
        { query: 'populate', args: [{ path: 'eLearningCoursesCount' }] },
        {
          query: 'populate',
          args: [{ path: 'activityHistories', select: 'updatedAt', options: { sort: { updatedAt: -1 } } }],
        },
        { query: 'setOptions', args: [{ isVendorUser: false }] },
        { query: 'lean' },
      ]
    );
  });
});

describe('getUser', () => {
  let findOne;
  beforeEach(() => {
    findOne = sinon.stub(User, 'findOne');
  });
  afterEach(() => {
    findOne.restore();
  });

  it('should return user without populating role', async () => {
    const userId = new ObjectId();
    const user = {
      _id: userId,
      role: { name: 'helper', rights: [] },
      userCompanyList: [{ _id: new ObjectId() }],
    };
    const credentials = { company: { _id: new ObjectId() }, _id: new ObjectId() };

    findOne.returns(SinonMongoose.stubChainedQueries(user, ['populate', 'setOptions', 'lean']));

    await UsersHelper.getUser(userId, credentials);

    SinonMongoose.calledOnceWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ _id: userId }] },
        { query: 'populate', args: [{ path: 'contracts', select: '-__v -createdAt -updatedAt' }] },
        {
          query: 'populate',
          args: [{ path: 'company', populate: { path: 'company' }, select: '-__v -createdAt -updatedAt' }],
        },
        {
          query: 'populate',
          args: [{
            path: 'sector',
            select: '_id sector',
            match: { company: credentials.company._id },
            options: { isVendorUser: false, requestingOwnInfos: false },
          }],
        },
        {
          query: 'populate',
          args: [{
            path: 'customers',
            select: '-__v -createdAt -updatedAt',
            match: { company: credentials.company._id },
            options: {
              isVendorUser: false,
              requestingOwnInfos: false,
            },
          }],
        },
        {
          query: 'populate',
          args: [{ path: 'companyLinkRequest', populate: { path: 'company', select: '_id name' } }],
        },
        { query: 'populate', args: [{ path: 'establishment', select: 'siret' }] },
        { query: 'populate', args: [{ path: 'userCompanyList' }] },
        { query: 'setOptions', args: [{ credentials }] },
        { query: 'lean', args: [{ autopopulate: true, virtuals: true }] },
      ]
    );
  });

  it('should return user populating role because isVendorUser', async () => {
    const userId = new ObjectId();
    const user = { _id: userId, role: { vendor: 'trainer', rights: [] } };
    const credentials = { company: { _id: new ObjectId() }, _id: new ObjectId(), role: { vendor: 'trainer' } };

    findOne.returns(SinonMongoose.stubChainedQueries(user, ['populate', 'setOptions', 'lean']));

    await UsersHelper.getUser(userId, credentials);

    SinonMongoose.calledOnceWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ _id: userId }] },
        {
          query: 'populate',
          args: [{ path: 'company', populate: { path: 'company' }, select: '-__v -createdAt -updatedAt' }],
        },
        { query: 'populate', args: [{ path: 'contracts', select: '-__v -createdAt -updatedAt' }] },
        {
          query: 'populate',
          args: [{
            path: 'sector',
            select: '_id sector',
            match: { company: credentials.company._id },
            options: { isVendorUser: true, requestingOwnInfos: false },
          }],
        },
        {
          query: 'populate',
          args: [{
            path: 'customers',
            select: '-__v -createdAt -updatedAt',
            match: { company: credentials.company._id },
            options: { isVendorUser: true, requestingOwnInfos: false },
          }],
        },
        {
          query: 'populate',
          args: [{ path: 'companyLinkRequest', populate: { path: 'company', select: '_id name' } }],
        },
        { query: 'populate', args: [{ path: 'establishment', select: 'siret' }] },
        { query: 'populate', args: [{ path: 'userCompanyList' }] },
        { query: 'setOptions', args: [{ credentials }] },
        { query: 'lean', args: [{ autopopulate: true, virtuals: true }] },
      ]
    );
  });

  it('should return user populating role because requestingOwnInfos', async () => {
    const userId = new ObjectId();
    const user = { _id: userId, role: { vendor: 'trainer', rights: [] } };
    const credentials = { company: { _id: new ObjectId() }, _id: userId };

    findOne.returns(SinonMongoose.stubChainedQueries(user, ['populate', 'setOptions', 'lean']));

    await UsersHelper.getUser(userId, credentials);

    SinonMongoose.calledOnceWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ _id: userId }] },
        {
          query: 'populate',
          args: [{ path: 'company', populate: { path: 'company' }, select: '-__v -createdAt -updatedAt' }],
        },
        { query: 'populate', args: [{ path: 'contracts', select: '-__v -createdAt -updatedAt' }] },
        {
          query: 'populate',
          args: [{
            path: 'sector',
            select: '_id sector',
            match: { company: credentials.company._id },
            options: { isVendorUser: false, requestingOwnInfos: true },
          }],
        },
        {
          query: 'populate',
          args: [{
            path: 'customers',
            select: '-__v -createdAt -updatedAt',
            match: { company: credentials.company._id },
            options: { isVendorUser: false, requestingOwnInfos: true },
          }],
        },
        {
          query: 'populate',
          args: [{ path: 'companyLinkRequest', populate: { path: 'company', select: '_id name' } }],
        },
        { query: 'populate', args: [{ path: 'establishment', select: 'siret' }] },
        { query: 'populate', args: [{ path: 'userCompanyList' }] },
        { query: 'setOptions', args: [{ credentials }] },
        { query: 'lean', args: [{ autopopulate: true, virtuals: true }] },
      ]
    );
  });

  it('should return user populating companyLinkRequest', async () => {
    const userId = new ObjectId();
    const user = { _id: userId, companyLinkRequest: { company: { _id: new ObjectId(), name: 'Alenvi' } } };
    const credentials = { _id: userId };

    findOne.returns(SinonMongoose.stubChainedQueries(user, ['populate', 'setOptions', 'lean']));

    await UsersHelper.getUser(userId, credentials);

    SinonMongoose.calledOnceWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ _id: userId }] },
        {
          query: 'populate',
          args: [{ path: 'company', populate: { path: 'company' }, select: '-__v -createdAt -updatedAt' }],
        },
        { query: 'populate', args: [{ path: 'contracts', select: '-__v -createdAt -updatedAt' }] },
        {
          query: 'populate',
          args: [{
            path: 'sector',
            select: '_id sector',
            match: { company: null },
            options: { isVendorUser: false, requestingOwnInfos: true },
          }],
        },
        {
          query: 'populate',
          args: [{
            path: 'customers',
            select: '-__v -createdAt -updatedAt',
            match: { company: null },
            options: { isVendorUser: false, requestingOwnInfos: true },
          }],
        },
        {
          query: 'populate',
          args: [{ path: 'companyLinkRequest', populate: { path: 'company', select: '_id name' } }],
        },
        { query: 'populate', args: [{ path: 'establishment', select: 'siret' }] },
        { query: 'populate', args: [{ path: 'userCompanyList' }] },
        { query: 'setOptions', args: [{ credentials }] },
        { query: 'lean', args: [{ autopopulate: true, virtuals: true }] },
      ]
    );
  });

  it('should throw error if user not found', async () => {
    const userId = new ObjectId();
    const credentials = {
      company: { _id: new ObjectId() },
      role: { vendor: { _id: new ObjectId() } },
      _id: new ObjectId(),
    };

    try {
      findOne.returns(SinonMongoose.stubChainedQueries(null, ['populate', 'setOptions', 'lean']));

      await UsersHelper.getUser(userId, credentials);
    } catch (e) {
      expect(e.output.statusCode).toEqual(404);
    } finally {
      SinonMongoose.calledOnceWithExactly(
        findOne,
        [
          { query: 'findOne', args: [{ _id: userId }] },
          {
            query: 'populate',
            args: [{ path: 'company', populate: { path: 'company' }, select: '-__v -createdAt -updatedAt' }],
          },
          { query: 'populate', args: [{ path: 'contracts', select: '-__v -createdAt -updatedAt' }] },
          {
            query: 'populate',
            args: [{
              path: 'sector',
              select: '_id sector',
              match: { company: credentials.company._id },
              options: { isVendorUser: true, requestingOwnInfos: false },
            }],
          },
          {
            query: 'populate',
            args: [{
              path: 'customers',
              select: '-__v -createdAt -updatedAt',
              match: { company: credentials.company._id },
              options: { isVendorUser: true, requestingOwnInfos: false },
            }],
          },
          {
            query: 'populate',
            args: [{ path: 'companyLinkRequest', populate: { path: 'company', select: '_id name' } }],
          },
          { query: 'populate', args: [{ path: 'establishment', select: 'siret' }] },
          { query: 'populate', args: [{ path: 'userCompanyList' }] },
          { query: 'setOptions', args: [{ credentials }] },
          { query: 'lean', args: [{ autopopulate: true, virtuals: true }] },
        ]
      );
    }
  });
});

describe('userExists', () => {
  let findOne;
  const email = 'test@test.fr';
  const nonExistantEmail = 'toto.gateau@alenvi.io';
  const company = new ObjectId();
  const user = {
    _id: new ObjectId(),
    local: { email: 'test@test.fr' },
    role: { client: { _id: new ObjectId() } },
    company,
    userCompanyList: [{ company }],
  };
  const userWithoutCompany = { ...user, company: null, userCompanyList: [] };
  const vendorCredentials = { role: { vendor: { _id: new ObjectId() } }, company: { _id: new ObjectId() } };
  const clientCredentials = { role: { client: { _id: new ObjectId() } }, company: { _id: new ObjectId() } };
  beforeEach(() => {
    findOne = sinon.stub(User, 'findOne');
  });
  afterEach(() => {
    findOne.restore();
  });

  it('should find a user if credentials', async () => {
    findOne.returns(SinonMongoose.stubChainedQueries(user, ['populate', 'setOptions', 'lean']));

    const rep = await UsersHelper.userExists(email, vendorCredentials);

    expect(rep.exists).toBe(true);
    expect(rep.user).toEqual(omit(user, 'local'));

    SinonMongoose.calledOnceWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ 'local.email': email }, { role: 1 }] },
        { query: 'populate', args: [{ path: 'company'}] },
        { query: 'populate', args: [{ path: 'userCompanyList', sort: { startDate: 1 } }] },
        { query: 'setOptions', args: [{ credentials: vendorCredentials }] },
        { query: 'lean' },
      ]
    );
  });

  it('should not find as email does not exist', async () => {
    findOne.returns(SinonMongoose.stubChainedQueries(null, ['populate', 'setOptions', 'lean']));

    const rep = await UsersHelper.userExists(nonExistantEmail, vendorCredentials);

    expect(rep.exists).toBe(false);
    expect(rep.user).toEqual({});

    SinonMongoose.calledOnceWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ 'local.email': nonExistantEmail }, { role: 1 }] },
        { query: 'populate', args: [{ path: 'company'}] },
        { query: 'populate', args: [{ path: 'userCompanyList', sort: { startDate: 1 } }] },
        { query: 'setOptions', args: [{ credentials: vendorCredentials }] },
        { query: 'lean' },
      ]
    );
  });

  it('should only confirm targeted user exist, as logged user has only client role', async () => {
    findOne.returns(SinonMongoose.stubChainedQueries(user, ['populate', 'setOptions', 'lean']));

    const rep = await UsersHelper.userExists(email, clientCredentials);

    expect(rep.exists).toBe(true);
    expect(rep.user).toEqual({});
    SinonMongoose.calledOnceWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ 'local.email': email }, { role: 1 }] },
        { query: 'populate', args: [{ path: 'company'}] },
        { query: 'populate', args: [{ path: 'userCompanyList', sort: { startDate: 1 } }] },
        { query: 'setOptions', args: [{ credentials: clientCredentials }] },
        { query: 'lean' },
      ]
    );
  });

  it('should only confirm targeted user exist, as targeted user has good company in the future', async () => {
    findOne.returns(SinonMongoose.stubChainedQueries(
      {
        ...userWithoutCompany,
        userCompanyList: [{ company: clientCredentials.company._id, startDate: CompaniDate().add('P1D').toISO() }],
      },
      ['populate', 'setOptions', 'lean']
    ));

    const rep = await UsersHelper.userExists(email, clientCredentials);

    expect(rep.exists).toBe(true);
    expect(rep.user).toEqual(
      { ...omit(userWithoutCompany, 'local'), userCompanyList: [{ company: clientCredentials.company._id }] }
    );

    SinonMongoose.calledOnceWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ 'local.email': email }, { role: 1 }] },
        { query: 'populate', args: [{ path: 'company'}] },
        { query: 'populate', args: [{ path: 'userCompanyList', sort: { startDate: 1 } }] },
        { query: 'setOptions', args: [{ credentials: clientCredentials }] },
        { query: 'lean' },
      ]
    );
  });

  it('should only confirm targeted user exist, as targeted user has other company in the future', async () => {
    findOne.returns(SinonMongoose.stubChainedQueries(
      {
        ...userWithoutCompany,
        userCompanyList: [{ company: new ObjectId(), startDate: CompaniDate().add('P1D').toISO() }],
      },
      ['populate', 'setOptions', 'lean']
    ));

    const rep = await UsersHelper.userExists(email, clientCredentials);

    expect(rep.exists).toBe(true);
    expect(rep.user).toEqual({});

    SinonMongoose.calledOnceWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ 'local.email': email }, { role: 1 }] },
        { query: 'populate', args: [{ path: 'company'}] },
        { query: 'populate', args: [{ path: 'userCompanyList', sort: { startDate: 1 } }] },
        { query: 'setOptions', args: [{ credentials: clientCredentials }] },
        { query: 'lean' },
      ]
    );
  });

  it('should find targeted user and give all infos, as targeted user has no company', async () => {
    findOne.returns(SinonMongoose.stubChainedQueries(userWithoutCompany, ['populate', 'setOptions', 'lean']));

    const rep = await UsersHelper.userExists(email, clientCredentials);

    expect(rep.exists).toBe(true);
    expect(rep.user).toEqual(omit(userWithoutCompany, 'local'));

    SinonMongoose.calledOnceWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ 'local.email': email }, { role: 1 }] },
        { query: 'populate', args: [{ path: 'company'}] },
        { query: 'populate', args: [{ path: 'userCompanyList', sort: { startDate: 1 } }] },
        { query: 'setOptions', args: [{ credentials: clientCredentials }] },
        { query: 'lean' },
      ]
    );
  });

  it('should find an email but no user if no credentials', async () => {
    findOne.returns(SinonMongoose.stubChainedQueries(user, ['populate', 'setOptions', 'lean']));

    const rep = await UsersHelper.userExists(email, null);

    expect(rep.exists).toBe(true);
    expect(rep.user).toEqual({});

    SinonMongoose.calledOnceWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ 'local.email': email }, { role: 1 }] },
        { query: 'populate', args: [{ path: 'company'}] },
        { query: 'populate', args: [{ path: 'userCompanyList', sort: { startDate: 1 } }] },
        { query: 'setOptions', args: [{ credentials: null }] },
        { query: 'lean' },
      ]
    );
  });
});

describe('createAndSaveFile', () => {
  let addFileStub;
  let saveCertificateDriveIdStub;
  let saveFileStub;
  const uploadedFile = { id: '123456790', webViewLink: 'http://test.com' };

  beforeEach(() => {
    addFileStub = sinon.stub(GDriveStorageHelper, 'addFile').returns(uploadedFile);
    saveFileStub = sinon.stub(UsersHelper, 'saveFile');
    saveCertificateDriveIdStub = sinon.stub(UsersHelper, 'saveCertificateDriveId');
  });

  afterEach(() => {
    addFileStub.restore();
    saveFileStub.restore();
    saveCertificateDriveIdStub.restore();
  });

  it('upload a file on drive and save info to user', async () => {
    const params = { _id: new ObjectId(), driveId: '1234567890' };
    const payload = {
      fileName: 'test',
      file: 'true',
      type: 'cni',
      'Content-type': 'application/pdf',
    };

    const result = await UsersHelper.createAndSaveFile(params, payload);

    expect(result).toEqual(uploadedFile);
    sinon.assert.calledOnceWithExactly(
      addFileStub,
      { driveFolderId: params.driveId, name: payload.fileName, type: payload['Content-Type'], body: payload.file }
    );
    sinon.assert.calledOnceWithExactly(
      saveFileStub,
      params._id,
      payload.type,
      { driveId: uploadedFile.id, link: uploadedFile.webViewLink }
    );
    sinon.assert.notCalled(saveCertificateDriveIdStub);
  });

  it('upload a certificate file on drive and save info to user', async () => {
    const params = { _id: new ObjectId(), driveId: '1234567890' };
    const payload = {
      fileName: 'test',
      type: 'certificates',
      'Content-type': 'application/pdf',
      file: 'Ceci est un fichier',
    };

    const result = await UsersHelper.createAndSaveFile(params, payload);

    expect(result).toEqual(uploadedFile);
    sinon.assert.calledOnceWithExactly(
      addFileStub,
      {
        driveFolderId: params.driveId,
        name: payload.fileName,
        type: payload['Content-Type'],
        body: payload.file,
      }
    );
    sinon.assert.calledOnceWithExactly(
      saveCertificateDriveIdStub,
      params._id,
      { driveId: uploadedFile.id, link: uploadedFile.webViewLink }
    );
    sinon.assert.notCalled(saveFileStub);
  });
});

describe('createUser', () => {
  let userFindOne;
  let roleFindById;
  let userCreate;
  let userCompanyCreate;
  let userFindOneAndUpdate;
  let objectIdStub;
  let createHistoryStub;
  const userId = new ObjectId();
  const roleId = new ObjectId();

  beforeEach(() => {
    userFindOne = sinon.stub(User, 'findOne');
    roleFindById = sinon.stub(Role, 'findById');
    userCreate = sinon.stub(User, 'create');
    userCompanyCreate = sinon.stub(UserCompaniesHelper, 'create');
    userFindOneAndUpdate = sinon.stub(User, 'findOneAndUpdate');
    objectIdStub = sinon.stub(mongoose.Types, 'ObjectId').returns(userId);
    createHistoryStub = sinon.stub(SectorHistoriesHelper, 'createHistory');
  });

  afterEach(() => {
    userFindOne.restore();
    roleFindById.restore();
    userCreate.restore();
    userCompanyCreate.restore();
    userFindOneAndUpdate.restore();
    objectIdStub.restore();
    createHistoryStub.restore();
  });

  it('should create a new account for not logged user', async () => {
    const payload = {
      identity: { lastname: 'Test' },
      local: { email: 'toto@test.com' },
      contact: { phone: '0606060606' },
      origin: WEBAPP,
    };

    userCreate.returns({ identity: payload.identity, local: payload.local, contact: payload.contact });

    const result = await UsersHelper.createUser(payload, null);

    expect(result).toEqual({ identity: payload.identity, local: payload.local, contact: payload.contact });
    sinon.assert.notCalled(createHistoryStub);
    sinon.assert.notCalled(userCompanyCreate);
    sinon.assert.notCalled(userFindOne);
    sinon.assert.notCalled(roleFindById);
    sinon.assert.calledOnceWithExactly(userCreate, { ...payload, refreshToken: sinon.match.string });
  });

  it('client admin - should create an auxiliary for his organization and handles sector', async () => {
    const companyId = new ObjectId();
    const payload = {
      identity: { lastname: 'Test' },
      local: { email: 'toto@test.com' },
      role: roleId,
      sector: new ObjectId(),
      origin: WEBAPP,
    };
    const newUser = {
      _id: userId,
      identity: { lastname: 'Test' },
      local: { email: 'toto@test.com' },
      role: { client: { _id: roleId, name: 'auxiliary' } },
      origin: WEBAPP,
    };

    roleFindById.returns(SinonMongoose.stubChainedQueries(
      { _id: roleId, name: 'auxiliary', interface: 'client' },
      ['lean']
    ));
    userCreate.returns(newUser);
    userFindOne.returns(SinonMongoose.stubChainedQueries(newUser));

    const result = await UsersHelper.createUser(payload, { company: { _id: companyId } });

    expect(result).toEqual(newUser);
    sinon.assert.calledOnceWithExactly(createHistoryStub, { _id: userId, sector: payload.sector }, companyId);
    sinon.assert.calledOnceWithExactly(userCompanyCreate, { user: userId, company: companyId });
    SinonMongoose.calledOnceWithExactly(
      roleFindById,
      [{ query: 'findById', args: [payload.role, { name: 1, interface: 1 }] }, { query: 'lean' }]
    );
    sinon.assert.calledOnceWithExactly(
      userCreate,
      {
        identity: { lastname: 'Test' },
        local: { email: 'toto@test.com' },
        origin: WEBAPP,
        refreshToken: sinon.match.string,
        role: { client: roleId },
      }
    );
    SinonMongoose.calledOnceWithExactly(
      userFindOne,
      [
        { query: 'findOne', args: [{ _id: userId }] },
        { query: 'populate', args: [{ path: 'sector', select: '_id sector', match: { company: companyId } }] },
        { query: 'lean', args: [{ virtuals: true, autopopulate: true }] },
      ]
    );
    sinon.assert.notCalled(userFindOneAndUpdate);
  });

  it('client admin - should create a coach for his organization', async () => {
    const companyId = new ObjectId();
    const payload = {
      identity: { lastname: 'Test', firstname: 'Toto' },
      local: { email: 'toto@test.com' },
      role: { client: roleId },
      origin: WEBAPP,
    };
    const newUser = { ...payload, _id: userId, role: { _id: roleId, name: 'coach' } };

    roleFindById.returns(SinonMongoose.stubChainedQueries(
      { _id: roleId, name: 'coach', interface: 'client' },
      ['lean']
    ));
    userCreate.returns(newUser);
    userFindOne.returns(SinonMongoose.stubChainedQueries(newUser));

    const result = await UsersHelper.createUser(payload, { company: { _id: companyId } });

    expect(result).toEqual(newUser);
    sinon.assert.notCalled(createHistoryStub);
    sinon.assert.calledOnceWithExactly(userCompanyCreate, { user: userId, company: companyId });
    SinonMongoose.calledOnceWithExactly(
      roleFindById,
      [{ query: 'findById', args: [payload.role, { name: 1, interface: 1 }] }, { query: 'lean' }]
    );
    sinon.assert.calledOnceWithExactly(userCreate, { ...payload, refreshToken: sinon.match.string });
    SinonMongoose.calledOnceWithExactly(
      userFindOne,
      [
        { query: 'findOne', args: [{ _id: userId }] },
        { query: 'populate', args: [{ path: 'sector', select: '_id sector', match: { company: companyId } }] },
        { query: 'lean', args: [{ virtuals: true, autopopulate: true }] },
      ]
    );
  });

  it('vendor admin - should create a client admin with company', async () => {
    const credentialsCompanyId = new ObjectId();
    const userCompanyId = new ObjectId();
    const payload = {
      identity: { lastname: 'Admin', firstname: 'Toto' },
      local: { email: 'admin@test.com' },
      role: roleId,
      company: userCompanyId,
      origin: WEBAPP,
    };
    const newUser = { ...payload, _id: userId, role: { _id: roleId, name: 'client_admin' } };

    roleFindById.returns(SinonMongoose.stubChainedQueries(
      { _id: roleId, name: 'client_admin', interface: 'client' },
      ['lean']
    ));
    userCreate.returns(newUser);
    userFindOne.returns(SinonMongoose.stubChainedQueries(newUser));

    const result = await UsersHelper.createUser(payload, { company: { _id: credentialsCompanyId } });

    expect(result).toEqual(newUser);
    sinon.assert.calledOnceWithExactly(userCompanyCreate, { user: userId, company: userCompanyId });
    SinonMongoose.calledOnceWithExactly(
      roleFindById,
      [{ query: 'findById', args: [payload.role, { name: 1, interface: 1 }] }, { query: 'lean' }]
    );
    sinon.assert.calledOnceWithExactly(
      userCreate,
      { ...payload, role: { client: roleId }, refreshToken: sinon.match.string }
    );
    SinonMongoose.calledOnceWithExactly(
      userFindOne,
      [
        { query: 'findOne', args: [{ _id: userId }] },
        { query: 'populate', args: [{ path: 'sector', select: '_id sector', match: { company: payload.company } }] },
        { query: 'lean', args: [{ virtuals: true, autopopulate: true }] },
      ]
    );
  });

  it('vendor admin - should create a trainer without company', async () => {
    const companyId = new ObjectId();
    const payload = {
      identity: { lastname: 'Admin', firstname: 'Toto' },
      local: { email: 'trainer@test.com' },
      role: roleId,
      origin: WEBAPP,
    };
    const newUser = { ...payload, _id: userId, role: { _id: roleId, name: 'trainer' } };

    roleFindById.returns(SinonMongoose.stubChainedQueries(
      { _id: roleId, name: 'trainer', interface: 'vendor' },
      ['lean']
    ));
    userCreate.returns(newUser);

    const result = await UsersHelper.createUser(payload, { company: { _id: companyId } });

    expect(result).toEqual(newUser);
    sinon.assert.notCalled(userFindOne);
    sinon.assert.notCalled(userCompanyCreate);
    SinonMongoose.calledOnceWithExactly(
      roleFindById,
      [{ query: 'findById', args: [payload.role, { name: 1, interface: 1 }] }, { query: 'lean' }]
    );
    sinon.assert.calledOnceWithExactly(
      userCreate,
      { ...payload, role: { vendor: roleId }, refreshToken: sinon.match.string }
    );
  });

  it('vendor admin - should create a user without role but with company', async () => {
    const credentialsCompanyId = new ObjectId();
    const userCompanyId = new ObjectId();
    const payload = {
      identity: { lastname: 'Test', firstname: 'Toto' },
      local: { email: 'toto@test.com' },
      company: userCompanyId,
      userCompanyStartDate: '2022-12-13T16:00:12.000Z',
      origin: WEBAPP,
    };
    const newUser = { ...payload, _id: userId };

    userCreate.returns(newUser);

    const result = await UsersHelper.createUser(payload, { company: { _id: credentialsCompanyId } });

    expect(result).toEqual(newUser);
    sinon.assert.notCalled(createHistoryStub);
    sinon.assert.notCalled(roleFindById);
    sinon.assert.notCalled(userFindOne);
    sinon.assert.calledOnceWithExactly(
      userCompanyCreate,
      { user: userId, company: userCompanyId, startDate: '2022-12-13T16:00:12.000Z' }
    );
    sinon.assert.calledOnceWithExactly(userCreate, { ...payload, refreshToken: sinon.match.string });
  });

  it('should return a 400 error if role does not exist', async () => {
    const companyId = new ObjectId();
    const payload = {
      identity: { lastname: 'Test', firstname: 'Toto' },
      local: { email: 'toto@test.com' },
      role: roleId,
      origin: WEBAPP,
    };
    try {
      roleFindById.returns(SinonMongoose.stubChainedQueries(null, ['lean']));

      await UsersHelper.createUser(payload, { company: { _id: companyId } });
    } catch (e) {
      expect(e).toEqual(Boom.badRequest('Le rôle n\'existe pas.'));
    } finally {
      sinon.assert.notCalled(createHistoryStub);
      sinon.assert.notCalled(userCreate);
      sinon.assert.notCalled(userCompanyCreate);
      sinon.assert.notCalled(userFindOne);
      SinonMongoose.calledOnceWithExactly(
        roleFindById,
        [{ query: 'findById', args: [payload.role, { name: 1, interface: 1 }] }, { query: 'lean' }]
      );
    }
  });
});

describe('removeUser', () => {
  let deleteOne;
  let deleteOneCompanyLinkRequest;
  let updateManyCourse;
  let removeHelper;
  let deleteManyActivityHistories;
  beforeEach(() => {
    deleteOne = sinon.stub(User, 'deleteOne');
    deleteOneCompanyLinkRequest = sinon.stub(CompanyLinkRequest, 'deleteOne');
    updateManyCourse = sinon.stub(Course, 'updateMany');
    removeHelper = sinon.stub(UsersHelper, 'removeHelper');
    deleteManyActivityHistories = sinon.stub(ActivityHistory, 'deleteMany');
  });
  afterEach(() => {
    deleteOne.restore();
    deleteOneCompanyLinkRequest.restore();
    updateManyCourse.restore();
    removeHelper.restore();
    deleteManyActivityHistories.restore();
  });

  it('should delete account', async () => {
    const userId = new ObjectId();

    await UsersHelper.removeUser({ _id: userId }, { _id: userId });

    sinon.assert.calledOnceWithExactly(deleteManyActivityHistories, { user: userId });
    sinon.assert.calledOnceWithExactly(deleteOne, { _id: userId });
    sinon.assert.calledOnceWithExactly(deleteOneCompanyLinkRequest, { user: userId });
    sinon.assert.calledOnceWithExactly(updateManyCourse, { trainees: userId }, { $pull: { trainees: userId } });
  });

  it('should call removeHelper', async () => {
    const userId = new ObjectId();
    await UsersHelper.removeUser({ _id: userId }, { _id: new ObjectId() });

    sinon.assert.calledOnceWithExactly(UsersHelper.removeHelper, { _id: userId });
  });
});

describe('removeHelper', () => {
  let updateOne;
  let remove;
  let deleteOne;
  beforeEach(() => {
    updateOne = sinon.stub(User, 'updateOne');
    remove = sinon.stub(HelpersHelper, 'remove');
    deleteOne = sinon.stub(UserCompany, 'deleteOne');
  });
  afterEach(() => {
    updateOne.restore();
    remove.restore();
    deleteOne.restore();
  });

  it('should remove client role and customers', async () => {
    const userId = new ObjectId();
    await UsersHelper.removeHelper({ _id: userId });

    sinon.assert.calledOnceWithExactly(updateOne, { _id: userId }, { $unset: { 'role.client': '' } });
    sinon.assert.calledOnceWithExactly(remove, userId);
    sinon.assert.calledOnceWithExactly(deleteOne, { user: userId });
  });
});

describe('updateUser', () => {
  let userUpdateOne;
  let roleFindById;
  let updateHistoryOnSectorUpdateStub;
  let createHelper;
  let userCompanyCreate;
  const credentials = { company: { _id: new ObjectId() } };
  const userId = new ObjectId();

  beforeEach(() => {
    userUpdateOne = sinon.stub(User, 'updateOne');
    roleFindById = sinon.stub(Role, 'findById');
    updateHistoryOnSectorUpdateStub = sinon.stub(SectorHistoriesHelper, 'updateHistoryOnSectorUpdate');
    createHelper = sinon.stub(HelpersHelper, 'create');
    userCompanyCreate = sinon.stub(UserCompaniesHelper, 'create');
  });
  afterEach(() => {
    userUpdateOne.restore();
    roleFindById.restore();
    updateHistoryOnSectorUpdateStub.restore();
    createHelper.restore();
    userCompanyCreate.restore();
  });

  it('should update a user', async () => {
    const payload = { identity: { firstname: 'Titi' } };

    await UsersHelper.updateUser(userId, payload, credentials);

    sinon.assert.calledOnceWithExactly(userUpdateOne, { _id: userId }, { $set: flat(payload) });
    sinon.assert.notCalled(roleFindById);
    sinon.assert.notCalled(updateHistoryOnSectorUpdateStub);
    sinon.assert.notCalled(userCompanyCreate);
  });

  it('should update a user without company', async () => {
    const payload = { identity: { firstname: 'Titi' } };

    await UsersHelper.updateUser(userId, payload, credentials);

    sinon.assert.calledOnceWithExactly(userUpdateOne, { _id: userId }, { $set: flat(payload) });
    sinon.assert.notCalled(roleFindById);
    sinon.assert.notCalled(createHelper);
    sinon.assert.notCalled(updateHistoryOnSectorUpdateStub);
    sinon.assert.notCalled(userCompanyCreate);
  });

  it('should update a user and create helper', async () => {
    const payload = { role: new ObjectId(), customer: new ObjectId() };
    const payloadWithRole = { 'role.client': payload.role.toHexString() };

    roleFindById.returns(SinonMongoose.stubChainedQueries(
      { _id: payload.role, name: 'test', interface: 'client' },
      ['lean']
    ));

    await UsersHelper.updateUser(userId, payload, credentials);

    sinon.assert.calledOnceWithExactly(userUpdateOne, { _id: userId }, { $set: payloadWithRole });
    sinon.assert.calledOnceWithExactly(createHelper, userId, payload.customer, credentials.company._id);
    sinon.assert.notCalled(updateHistoryOnSectorUpdateStub);
    SinonMongoose.calledOnceWithExactly(
      roleFindById,
      [{ query: 'findById', args: [payload.role, { name: 1, interface: 1 }] }, { query: 'lean' }]
    );
    sinon.assert.notCalled(userCompanyCreate);
  });

  it('should update a user and create sector history', async () => {
    const payload = { identity: { firstname: 'Titi' }, sector: new ObjectId() };

    await UsersHelper.updateUser(userId, payload, credentials);

    sinon.assert.calledOnceWithExactly(userUpdateOne, { _id: userId }, { $set: flat(omit(payload, 'sector')) });
    sinon.assert.notCalled(createHelper);
    sinon.assert.calledOnceWithExactly(
      updateHistoryOnSectorUpdateStub,
      userId,
      payload.sector,
      credentials.company._id
    );
    sinon.assert.notCalled(roleFindById);
    sinon.assert.notCalled(userCompanyCreate);
  });

  it('should update a user role', async () => {
    const payload = { role: new ObjectId() };
    const payloadWithRole = { 'role.client': payload.role.toHexString() };

    roleFindById.returns(SinonMongoose.stubChainedQueries(
      { _id: payload.role, name: 'test', interface: 'client' },
      ['lean']
    ));

    await UsersHelper.updateUser(userId, payload, credentials);

    sinon.assert.calledOnceWithExactly(userUpdateOne, { _id: userId }, { $set: payloadWithRole });
    sinon.assert.notCalled(createHelper);
    SinonMongoose.calledOnceWithExactly(
      roleFindById,
      [{ query: 'findById', args: [payload.role, { name: 1, interface: 1 }] }, { query: 'lean' }]
    );
    sinon.assert.notCalled(updateHistoryOnSectorUpdateStub);
    sinon.assert.notCalled(userCompanyCreate);
  });

  it('should update a user company WITH startDate', async () => {
    const payload = { company: new ObjectId(), userCompanyStartDate: '2022-12-13T13:45:00.000Z' };

    await UsersHelper.updateUser(userId, payload, credentials);

    sinon.assert.calledOnceWithExactly(userUpdateOne, { _id: userId }, { $set: flat(omit(payload, 'company')) });
    sinon.assert.calledOnceWithExactly(
      userCompanyCreate,
      { user: userId, company: payload.company, startDate: '2022-12-13T13:45:00.000Z' }
    );
    sinon.assert.notCalled(createHelper);
    sinon.assert.notCalled(roleFindById);
    sinon.assert.notCalled(updateHistoryOnSectorUpdateStub);
  });

  it('should update a user company WITHOUT startDate', async () => {
    const payload = { company: new ObjectId() };

    await UsersHelper.updateUser(userId, payload, credentials);

    sinon.assert.calledOnceWithExactly(userUpdateOne, { _id: userId }, { $set: flat(omit(payload, 'company')) });
    sinon.assert.calledOnceWithExactly(userCompanyCreate, { user: userId, company: payload.company });
    sinon.assert.notCalled(createHelper);
    sinon.assert.notCalled(roleFindById);
    sinon.assert.notCalled(updateHistoryOnSectorUpdateStub);
  });

  it('should return a 400 error if role does not exists', async () => {
    const payload = { role: new ObjectId() };

    roleFindById.returns(SinonMongoose.stubChainedQueries(null, ['lean']));

    try {
      await UsersHelper.updateUser(userId, payload, credentials);
    } catch (e) {
      expect(e).toEqual(Boom.badRequest('Le rôle n\'existe pas.'));
    } finally {
      SinonMongoose.calledOnceWithExactly(
        roleFindById,
        [{ query: 'findById', args: [payload.role, { name: 1, interface: 1 }] }, { query: 'lean' }]
      );
      sinon.assert.notCalled(createHelper);
      sinon.assert.notCalled(userUpdateOne);
      sinon.assert.notCalled(updateHistoryOnSectorUpdateStub);
      sinon.assert.notCalled(userCompanyCreate);
    }
  });
});

describe('updateUserCertificates', async () => {
  let updateOne;
  beforeEach(() => {
    updateOne = sinon.stub(User, 'updateOne');
  });
  afterEach(() => {
    updateOne.restore();
  });

  it('should update a user certificate', async () => {
    const payload = { certificates: { driveId: '1234567890' } };
    const userId = new ObjectId();

    await UsersHelper.updateUserCertificates(userId, payload);

    sinon.assert.calledOnceWithExactly(
      updateOne,
      { _id: userId },
      { $pull: { 'administrative.certificates': payload.certificates } }
    );
  });
});

describe('updateUserInactivityDate', () => {
  let countDocuments;
  let updateOne;
  beforeEach(() => {
    countDocuments = sinon.stub(Contract, 'countDocuments');
    updateOne = sinon.stub(User, 'updateOne');
  });
  afterEach(() => {
    countDocuments.restore();
    updateOne.restore();
  });

  it('should update user inactivity date', async () => {
    const userId = new ObjectId();
    const endDate = '2019-02-12T00:00:00';
    const credentials = { company: { _id: '1234567890' } };

    countDocuments.returns(0);

    await UsersHelper.updateUserInactivityDate(userId, endDate, credentials);
    sinon.assert.calledOnceWithExactly(
      countDocuments,
      { user: userId, company: '1234567890', $or: [{ endDate: { $exists: false } }, { endDate: null }] }
    );
    sinon.assert.calledOnceWithExactly(
      updateOne,
      { _id: userId },
      { $set: { inactivityDate: moment(endDate).add('1', 'month').startOf('M').toDate() } }
    );
  });

  it('should not update user inactivity date', async () => {
    const userId = new ObjectId();
    const endDate = '2019-02-12T00:00:00';
    const credentials = { company: { _id: '1234567890' } };

    countDocuments.returns(2);

    await UsersHelper.updateUserInactivityDate(userId, endDate, credentials);
    sinon.assert.calledOnceWithExactly(
      countDocuments,
      { user: userId, company: '1234567890', $or: [{ endDate: { $exists: false } }, { endDate: null }] }
    );
    sinon.assert.notCalled(updateOne);
  });
});

describe('uploadPicture', () => {
  let updateOneStub;
  let uploadUserMedia;
  beforeEach(() => {
    updateOneStub = sinon.stub(User, 'updateOne');
    uploadUserMedia = sinon.stub(GCloudStorageHelper, 'uploadUserMedia');
  });
  afterEach(() => {
    updateOneStub.restore();
    uploadUserMedia.restore();
  });

  it('should upload image', async () => {
    uploadUserMedia.returns({
      publicId: 'jesuisunsupernomdefichier',
      link: 'https://storage.googleapis.com/BucketKFC/myMedia',
    });

    const userId = new ObjectId();
    const payload = { file: new ArrayBuffer(32), fileName: 'illustration' };

    await UsersHelper.uploadPicture(userId, payload);

    sinon.assert.calledOnceWithExactly(uploadUserMedia, { file: new ArrayBuffer(32), fileName: 'illustration' });
    sinon.assert.calledOnceWithExactly(
      updateOneStub,
      { _id: userId },
      {
        $set: flat({
          picture: { publicId: 'jesuisunsupernomdefichier', link: 'https://storage.googleapis.com/BucketKFC/myMedia' },
        }),
      }
    );
  });
});

describe('deleteMedia', () => {
  let updateOne;
  let deleteUserMedia;
  beforeEach(() => {
    updateOne = sinon.stub(User, 'updateOne');
    deleteUserMedia = sinon.stub(GCloudStorageHelper, 'deleteUserMedia');
  });
  afterEach(() => {
    updateOne.restore();
    deleteUserMedia.restore();
  });

  it('should do nothing as publicId is not set', async () => {
    const userId = new ObjectId();
    await UsersHelper.deletePicture(userId, '');

    sinon.assert.notCalled(updateOne);
    sinon.assert.notCalled(deleteUserMedia);
  });

  it('should update user and delete media', async () => {
    const userId = new ObjectId();
    await UsersHelper.deletePicture(userId, 'publicId');

    sinon.assert.calledOnceWithExactly(
      updateOne,
      { _id: userId },
      { $unset: { 'picture.publicId': '', 'picture.link': '' } }
    );
    sinon.assert.calledOnceWithExactly(deleteUserMedia, 'publicId');
  });
});

describe('createDriveFolder', () => {
  let userCompanyFindOne;
  let createFolder;
  let userUpdateOne;
  const credentials = { company: { _id: new ObjectId() }, _id: new ObjectId() };

  beforeEach(() => {
    userCompanyFindOne = sinon.stub(UserCompany, 'findOne');
    createFolder = sinon.stub(GDriveStorageHelper, 'createFolder');
    userUpdateOne = sinon.stub(User, 'updateOne');
  });
  afterEach(() => {
    userCompanyFindOne.restore();
    createFolder.restore();
    userUpdateOne.restore();
  });

  it('should create a google drive folder and update user', async () => {
    const userId = new ObjectId();
    const user = { _id: userId, identity: { lastname: 'Delenda' } };

    userCompanyFindOne.returns(SinonMongoose.stubChainedQueries(
      { company: { auxiliariesFolderId: 'auxiliariesFolderId' }, user },
      ['populate', 'lean']
    ));
    createFolder.returns({ webViewLink: 'webViewLink', id: 'folderId' });

    await UsersHelper.createDriveFolder(userId, credentials);

    SinonMongoose.calledOnceWithExactly(
      userCompanyFindOne,
      [
        { query: 'findOne', args: [{ user: userId, company: credentials.company._id }] },
        { query: 'populate', args: [{ path: 'user', select: 'identity' }] },
        { query: 'populate', args: [{ path: 'company', select: 'auxiliariesFolderId' }] },
        { query: 'lean' },
      ]
    );
    sinon.assert.calledOnceWithExactly(createFolder, { lastname: 'Delenda' }, 'auxiliariesFolderId');
    sinon.assert.calledOnceWithExactly(
      userUpdateOne,
      { _id: user._id },
      { $set: { 'administrative.driveFolder.link': 'webViewLink', 'administrative.driveFolder.driveId': 'folderId' } }
    );
  });

  it('should return a 422 if user has no company', async () => {
    const userId = new ObjectId();
    try {
      userCompanyFindOne.returns(SinonMongoose.stubChainedQueries(null, ['populate', 'lean']));

      await UsersHelper.createDriveFolder(userId, credentials);
    } catch (e) {
      expect(e.output.statusCode).toEqual(422);
    } finally {
      SinonMongoose.calledOnceWithExactly(
        userCompanyFindOne,
        [
          { query: 'findOne', args: [{ user: userId, company: credentials.company._id }] },
          { query: 'populate', args: [{ path: 'user', select: 'identity' }] },
          { query: 'populate', args: [{ path: 'company', select: 'auxiliariesFolderId' }] },
          { query: 'lean' },
        ]
      );
      sinon.assert.notCalled(createFolder);
      sinon.assert.notCalled(userUpdateOne);
    }
  });

  it('should return a 422 if user company has no auxialiaries folder Id', async () => {
    const userId = new ObjectId();
    try {
      userCompanyFindOne.returns(SinonMongoose.stubChainedQueries(
        { user: { _id: userId }, company: { _id: new ObjectId() } },
        ['populate', 'lean']
      ));

      await UsersHelper.createDriveFolder(userId, credentials);
    } catch (e) {
      expect(e.output.statusCode).toEqual(422);
    } finally {
      SinonMongoose.calledOnceWithExactly(
        userCompanyFindOne,
        [
          { query: 'findOne', args: [{ user: userId, company: credentials.company._id }] },
          { query: 'populate', args: [{ path: 'user', select: 'identity' }] },
          { query: 'populate', args: [{ path: 'company', select: 'auxiliariesFolderId' }] },
          { query: 'lean' },
        ]
      );
      sinon.assert.notCalled(createFolder);
      sinon.assert.notCalled(userUpdateOne);
    }
  });
});

describe('addExpoToken', () => {
  let updateOne;
  beforeEach(() => {
    updateOne = sinon.stub(User, 'updateOne');
  });
  afterEach(() => {
    updateOne.restore();
  });

  it('should remove expoToken from user', async () => {
    const userId = new ObjectId();
    const companyId = new ObjectId();
    const credentials = { _id: userId, company: { _id: companyId } };
    const payload = { formationExpoToken: 'ExponentPushToken[jeSuisUnIdExpo]' };

    await UsersHelper.addExpoToken(payload, credentials);

    sinon.assert.calledOnceWithExactly(
      updateOne,
      { _id: userId },
      { $addToSet: { formationExpoTokenList: 'ExponentPushToken[jeSuisUnIdExpo]' } }
    );
  });
});

describe('removeExpoToken', () => {
  let updateOne;
  beforeEach(() => {
    updateOne = sinon.stub(User, 'updateOne');
  });
  afterEach(() => {
    updateOne.restore();
  });

  it('should remove expoToken from user', async () => {
    const userId = new ObjectId();
    const companyId = new ObjectId();
    const credentials = { _id: userId, company: { _id: companyId } };

    await UsersHelper.removeExpoToken('ExponentPushToken[jeSuisUnIdExpo]', credentials);

    sinon.assert.calledOnceWithExactly(
      updateOne,
      { _id: userId },
      { $pull: { formationExpoTokenList: 'ExponentPushToken[jeSuisUnIdExpo]' } }
    );
  });
});
