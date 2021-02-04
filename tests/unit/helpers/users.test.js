const mongoose = require('mongoose');
const { ObjectID } = require('mongodb');
const expect = require('expect');
const moment = require('moment');
const { fn: momentProto } = require('moment');
const sinon = require('sinon');
const Boom = require('@hapi/boom');
const flat = require('flat');
const omit = require('lodash/omit');
const get = require('lodash/get');
const SinonMongoose = require('../sinonMongoose');
const UsersHelper = require('../../../src/helpers/users');
const SectorHistoriesHelper = require('../../../src/helpers/sectorHistories');
const translate = require('../../../src/helpers/translate');
const GdriveStorageHelper = require('../../../src/helpers/gdriveStorage');
const GCloudStorageHelper = require('../../../src/helpers/gCloudStorage');
const User = require('../../../src/models/User');
const Contract = require('../../../src/models/Contract');
const Role = require('../../../src/models/Role');
const { HELPER, AUXILIARY_WITHOUT_COMPANY, WEBAPP } = require('../../../src/helpers/constants');
const Company = require('../../../src/models/Company');

require('sinon-mongoose');

const { language } = translate;

describe('formatQueryForUsersList', () => {
  let find;
  const credentials = { company: { _id: new ObjectID() }, _id: new ObjectID() };
  const companyId = credentials.company._id;

  beforeEach(() => {
    find = sinon.stub(Role, 'find');
  });

  afterEach(() => {
    find.restore();
  });

  it('should returns params without role if no role in query', async () => {
    const query = { company: companyId };

    const result = await UsersHelper.formatQueryForUsersList(query);

    expect(result).toEqual(query);
    sinon.assert.notCalled(find);
  });

  it('should return params with role', async () => {
    const query = { company: companyId, role: [{ _id: new ObjectID() }, { _id: new ObjectID() }] };
    const roles = [{ _id: query.role[0]._id, interface: 'vendor' }, { _id: query.role[1]._id, interface: 'vendor' }];

    find.returns(SinonMongoose.stubChainedQueries([roles], ['lean']));

    const result = await UsersHelper.formatQueryForUsersList(query);
    expect(result).toEqual({
      company: companyId,
      'role.vendor': { $in: [query.role[0]._id, query.role[1]._id] },
    });

    SinonMongoose.calledWithExactly(find, [
      { query: 'find', args: [{ name: { $in: query.role } }, { _id: 1, interface: 1 }] },
      { query: 'lean' },
    ]);
  });

  it('should return 404 if role does not exist', async () => {
    const query = { company: companyId, role: [{ _id: new ObjectID() }, { _id: new ObjectID() }] };
    try {
      find.returns(SinonMongoose.stubChainedQueries([[]], ['lean']));

      const result = await UsersHelper.formatQueryForUsersList(query);
      expect(result).toBeUndefined();
    } catch (e) {
      expect(e).toEqual(Boom.notFound(translate[language].roleNotFound));
    } finally {
      SinonMongoose.calledWithExactly(find, [
        { query: 'find', args: [{ name: { $in: query.role } }, { _id: 1, interface: 1 }] },
        { query: 'lean' },
      ]);
    }
  });
});

describe('getUsersList', () => {
  let formatQueryForUsersListStub;
  let find;
  const users = [{ _id: new ObjectID() }, { _id: new ObjectID() }];
  const credentials = { company: { _id: new ObjectID() }, _id: new ObjectID() };
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

    find.returns(SinonMongoose.stubChainedQueries([users], ['populate', 'setOptions', 'lean']));

    const result = await UsersHelper.getUsersList(query, { ...credentials, role: { client: 'test' } });
    expect(result).toEqual(users);
    sinon.assert.calledWithExactly(formatQueryForUsersListStub, query);
    SinonMongoose.calledWithExactly(find, [
      { query: 'find', args: [{ ...query, company: companyId }, {}, { autopopulate: false }] },
      { query: 'populate', args: [{ path: 'customers', select: 'identity driveFolder' }] },
      { query: 'populate', args: [{ path: 'role.client', select: '-__v -createdAt -updatedAt' }] },
      { query: 'populate',
        args: [{
          path: 'sector',
          select: '_id sector',
          match: { company: credentials.company._id },
          options: { isVendorUser: false },
        }] },
      { query: 'populate', args: [{ path: 'contracts', select: 'startDate endDate' }] },
      { query: 'setOptions', args: [{ isVendorUser: false }] },
      { query: 'lean', args: [{ virtuals: true, autopopulate: true }] },
    ]);
  });

  it('should get users according to roles', async () => {
    const query = { role: ['auxiliary', 'planning_referent'], company: companyId };
    const roles = [new ObjectID(), new ObjectID()];
    const formattedQuery = {
      company: companyId,
      'role.client': { $in: roles },
    };

    find.returns(SinonMongoose.stubChainedQueries([users], ['populate', 'setOptions', 'lean']));

    formatQueryForUsersListStub.returns(formattedQuery);

    const result = await UsersHelper.getUsersList(query, { ...credentials, role: { client: 'test' } });
    expect(result).toEqual(users);
    sinon.assert.calledWithExactly(formatQueryForUsersListStub, query);
    SinonMongoose.calledWithExactly(find, [
      { query: 'find', args: [formattedQuery, {}, { autopopulate: false }] },
      { query: 'populate', args: [{ path: 'customers', select: 'identity driveFolder' }] },
      { query: 'populate', args: [{ path: 'role.client', select: '-__v -createdAt -updatedAt' }] },
      { query: 'populate',
        args: [{
          path: 'sector',
          select: '_id sector',
          match: { company: credentials.company._id },
          options: { isVendorUser: false },
        }] },
      { query: 'populate', args: [{ path: 'contracts', select: 'startDate endDate' }] },
      { query: 'setOptions', args: [{ isVendorUser: false }] },
      { query: 'lean', args: [{ virtuals: true, autopopulate: true }] },
    ]);
  });
});

describe('getUsersListWithSectorHistories', () => {
  let find;
  let formatQueryForUsersListStub;
  const users = [{ _id: new ObjectID() }, { _id: new ObjectID() }];
  const credentials = { company: { _id: new ObjectID() }, _id: new ObjectID() };
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
    const roles = [new ObjectID(), new ObjectID()];

    const formattedQuery = {
      company: companyId,
      'role.client': { $in: roles },
    };

    find.returns(SinonMongoose.stubChainedQueries([users], ['populate', 'setOptions', 'lean']));
    formatQueryForUsersListStub.returns(formattedQuery);

    const result = await UsersHelper.getUsersListWithSectorHistories(
      query,
      { ...credentials, role: { client: 'test' } }
    );
    expect(result).toEqual(users);
    sinon.assert.calledWithExactly(
      formatQueryForUsersListStub,
      { ...query, role: ['auxiliary', 'planning_referent', 'auxiliary_without_company'] }
    );
    SinonMongoose.calledWithExactly(find, [
      { query: 'find', args: [formattedQuery, {}, { autopopulate: false }] },
      { query: 'populate', args: [{ path: 'role.client', select: '-__v -createdAt -updatedAt' }] },
      { query: 'populate',
        args: [{
          path: 'sectorHistories',
          select: '_id sector startDate endDate',
          match: { company: credentials.company._id },
          options: { isVendorUser: false },
        }] },
      { query: 'populate', args: [{ path: 'contracts', select: 'startDate endDate' }] },
      { query: 'setOptions', args: [{ isVendorUser: false }] },
      { query: 'lean', args: [{ virtuals: true, autopopulate: true }] },
    ]);
  });
});

describe('getLearnerList', () => {
  let findUser;
  let findRole;
  beforeEach(() => {
    findUser = sinon.stub(User, 'find');
    findRole = sinon.stub(Role, 'find');
  });
  afterEach(() => {
    findUser.restore();
    findRole.restore();
  });

  it('should get all learners', async () => {
    const query = {};
    const credentials = { role: { vendor: new ObjectID() } };
    const users = [
      { _id: new ObjectID(), activityHistories: [{ _id: new ObjectID() }] },
      { _id: new ObjectID(), activityHistories: [{ _id: new ObjectID() }] },
    ];
    const usersWithVirtuals = [
      { _id: users[0]._id, activityHistoryCount: 1, lastActivityHistory: users[0].activityHistories[0] },
      { _id: users[1]._id, activityHistoryCount: 1, lastActivityHistory: users[1].activityHistories[0] },
    ];

    findUser.returns(SinonMongoose.stubChainedQueries(
      [users],
      ['populate', 'setOptions', 'lean']
    ));

    const result = await UsersHelper.getLearnerList(query, credentials);

    expect(result).toEqual(usersWithVirtuals);
    sinon.assert.notCalled(findRole);
    SinonMongoose.calledWithExactly(findUser, [
      { query: 'find', args: [{}, 'identity.firstname identity.lastname picture', { autopopulate: false }] },
      { query: 'populate', args: [{ path: 'company', select: 'name' }] },
      { query: 'populate', args: [{ path: 'blendedCoursesCount' }] },
      { query: 'populate', args: [{ path: 'eLearningCoursesCount' }] },
      {
        query: 'populate',
        args: [{ path: 'activityHistories', select: 'updatedAt', options: { sort: { updatedAt: -1 } } }],
      },
      { query: 'setOptions', args: [{ isVendorUser: !!get(credentials, 'role.vendor') }] },
      { query: 'lean' },
    ]);
  });

  it('should get learners from company', async () => {
    const query = { company: new ObjectID() };
    const credentials = { role: { client: new ObjectID() } };
    const roleId1 = new ObjectID();
    const roleId2 = new ObjectID();
    const rolesToExclude = [{ _id: roleId1 }, { _id: roleId2 }];
    const users = [
      { _id: new ObjectID(), activityHistories: [{ _id: new ObjectID() }] },
      { _id: new ObjectID(), activityHistories: [{ _id: new ObjectID() }] },
    ];
    const usersWithVirtuals = [
      { _id: users[0]._id, activityHistoryCount: 1, lastActivityHistory: users[0].activityHistories[0] },
      { _id: users[1]._id, activityHistoryCount: 1, lastActivityHistory: users[1].activityHistories[0] },
    ];

    findRole.returns(rolesToExclude);
    findUser.returns(SinonMongoose.stubChainedQueries(
      [users],
      ['populate', 'setOptions', 'lean']
    ));

    const result = await UsersHelper.getLearnerList(query, credentials);

    expect(result).toEqual(usersWithVirtuals);
    sinon.assert.calledOnceWithExactly(findRole, { name: { $in: [HELPER, AUXILIARY_WITHOUT_COMPANY] } });
    SinonMongoose.calledWithExactly(findUser, [
      { query: 'find',
        args: [
          { company: query.company, 'role.client': { $not: { $in: [roleId1, roleId2] } } },
          'identity.firstname identity.lastname picture',
          { autopopulate: false },
        ] },
      { query: 'populate', args: [{ path: 'company', select: 'name' }] },
      { query: 'populate', args: [{ path: 'blendedCoursesCount' }] },
      {
        query: 'populate',
        args: [{ path: 'activityHistories', select: 'updatedAt', options: { sort: { updatedAt: -1 } } }],
      },
      { query: 'setOptions', args: [{ isVendorUser: false }] },
      { query: 'lean' },
    ]);
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
    const userId = new ObjectID();
    const user = { _id: userId, role: { name: 'helper', rights: [] } };
    const credentials = { company: { _id: new ObjectID() }, _id: new ObjectID() };

    findOne.returns(SinonMongoose.stubChainedQueries([user], ['populate', 'lean']));

    await UsersHelper.getUser(userId, credentials);

    SinonMongoose.calledWithExactly(findOne, [
      { query: 'findOne', args: [{ _id: userId }] },
      { query: 'populate', args: [{ path: 'contracts', select: '-__v -createdAt -updatedAt' }] },
      {
        query: 'populate',
        args: [{
          path: 'sector',
          select: '_id sector',
          match: { company: credentials.company._id },
          options: { isVendorUser: false, requestingOwnInfos: false },
        }],
      },
      { query: 'lean', args: [{ autopopulate: true, virtuals: true }] },
    ]);
  });

  it('should return user populating role because isVendorUser', async () => {
    const userId = new ObjectID();
    const user = { _id: userId, role: { vendor: 'trainer', rights: [] } };
    const credentials = { company: { _id: new ObjectID() }, _id: new ObjectID(), role: { vendor: 'trainer' } };

    findOne.returns(SinonMongoose.stubChainedQueries([user], ['populate', 'lean']));

    await UsersHelper.getUser(userId, credentials);

    SinonMongoose.calledWithExactly(findOne, [
      { query: 'findOne', args: [{ _id: userId }] },
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
      { query: 'lean', args: [{ autopopulate: true, virtuals: true }] },
    ]);
  });

  it('should return user populating role because requestingOwnInfos', async () => {
    const userId = new ObjectID();
    const user = { _id: userId, role: { vendor: 'trainer', rights: [] } };
    const credentials = { company: { _id: new ObjectID() }, _id: userId };

    findOne.returns(SinonMongoose.stubChainedQueries([user], ['populate', 'lean']));

    await UsersHelper.getUser(userId, credentials);

    SinonMongoose.calledWithExactly(findOne, [
      { query: 'findOne', args: [{ _id: userId }] },
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
      { query: 'lean', args: [{ autopopulate: true, virtuals: true }] },
    ]);
  });

  it('should throw error if user not found', async () => {
    const userId = new ObjectID();
    const credentials = {
      company: { _id: new ObjectID() },
      role: { vendor: { _id: new ObjectID() } },
      _id: new ObjectID(),
    };

    try {
      findOne.returns(SinonMongoose.stubChainedQueries([null], ['populate', 'lean']));

      await UsersHelper.getUser(userId, credentials);
    } catch (e) {
      expect(e.output.statusCode).toEqual(404);
    } finally {
      SinonMongoose.calledWithExactly(findOne, [
        { query: 'findOne', args: [{ _id: userId }] },
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
        { query: 'lean', args: [{ autopopulate: true, virtuals: true }] },
      ]);
    }
  });
});

describe('userExists', () => {
  let findOne;
  const email = 'test@test.fr';
  const nonExistantEmail = 'toto.gateau@alenvi.io';
  const user = {
    _id: new ObjectID(),
    local: { email: 'test@test.fr' },
    role: { client: { _id: new ObjectID() } },
    company: new ObjectID(),
  };
  const userWithoutCompany = omit(user, 'company');
  const vendorCredentials = { role: { vendor: { _id: new ObjectID() } } };
  const clientCredentials = { role: { client: { _id: new ObjectID() } } };
  beforeEach(() => {
    findOne = sinon.stub(User, 'findOne');
  });
  afterEach(() => {
    findOne.restore();
  });

  it('should find a user if credentials', async () => {
    findOne.returns(SinonMongoose.stubChainedQueries([user], ['lean']));

    const rep = await UsersHelper.userExists(email, vendorCredentials);

    expect(rep.exists).toBe(true);
    expect(rep.user).toEqual(omit(user, 'local'));

    SinonMongoose.calledWithExactly(findOne, [
      { query: 'findOne', args: [{ 'local.email': email }, { company: 1, role: 1 }] },
      { query: 'lean', args: [] },
    ]);
  });

  it('should not find as email does not exist', async () => {
    findOne.returns(SinonMongoose.stubChainedQueries([null], ['lean']));

    const rep = await UsersHelper.userExists(nonExistantEmail, vendorCredentials);

    expect(rep.exists).toBe(false);
    expect(rep.user).toEqual({});

    SinonMongoose.calledWithExactly(findOne, [
      { query: 'findOne', args: [{ 'local.email': nonExistantEmail }, { company: 1, role: 1 }] },
      { query: 'lean', args: [] },
    ]);
  });

  it('should only confirm targeted user exist, as logged user has only client role', async () => {
    findOne.returns(SinonMongoose.stubChainedQueries([user], ['lean']));

    const rep = await UsersHelper.userExists(email, clientCredentials);

    expect(rep.exists).toBe(true);
    expect(rep.user).toEqual({});
    SinonMongoose.calledWithExactly(findOne, [
      { query: 'findOne', args: [{ 'local.email': email }, { company: 1, role: 1 }] },
      { query: 'lean', args: [] },
    ]);
  });

  it('should find targeted user and give all infos, as targeted user has no company', async () => {
    findOne.returns(SinonMongoose.stubChainedQueries([userWithoutCompany], ['lean']));

    const rep = await UsersHelper.userExists(email, clientCredentials);

    expect(rep.exists).toBe(true);
    expect(rep.user).toEqual(omit(userWithoutCompany, 'local'));

    SinonMongoose.calledWithExactly(findOne, [
      { query: 'findOne', args: [{ 'local.email': email }, { company: 1, role: 1 }] },
      { query: 'lean', args: [] },
    ]);
  });

  it('should find an email but no user if no credentials', async () => {
    findOne.returns(SinonMongoose.stubChainedQueries([user], ['lean']));

    const rep = await UsersHelper.userExists(email);

    expect(rep.exists).toBe(true);
    expect(rep.user).toEqual({});

    SinonMongoose.calledWithExactly(findOne, [
      { query: 'findOne', args: [{ 'local.email': email }, { company: 1, role: 1 }] },
      { query: 'lean', args: [] },
    ]);
  });
});

describe('createAndSaveFile', () => {
  let addFileStub;
  let saveCertificateDriveIdStub;
  let saveFileStub;
  const uploadedFile = { id: '123456790', webViewLink: 'http://test.com' };

  beforeEach(() => {
    addFileStub = sinon.stub(GdriveStorageHelper, 'addFile').returns(uploadedFile);
    saveFileStub = sinon.stub(UsersHelper, 'saveFile');
    saveCertificateDriveIdStub = sinon.stub(UsersHelper, 'saveCertificateDriveId');
  });

  afterEach(() => {
    addFileStub.restore();
    saveFileStub.restore();
    saveCertificateDriveIdStub.restore();
  });

  it('upload a file on drive and save info to user', async () => {
    const params = { _id: new ObjectID(), driveId: '1234567890' };
    const payload = {
      fileName: 'test',
      file: 'true',
      type: 'cni',
      'Content-type': 'application/pdf',
    };

    const result = await UsersHelper.createAndSaveFile(params, payload);

    expect(result).toEqual(uploadedFile);
    sinon.assert.calledWithExactly(addFileStub, {
      driveFolderId: params.driveId,
      name: payload.fileName,
      type: payload['Content-Type'],
      body: payload.file,
    });
    sinon.assert.calledWithExactly(saveFileStub, params._id, payload.type, {
      driveId: uploadedFile.id,
      link: uploadedFile.webViewLink,
    });
    sinon.assert.notCalled(saveCertificateDriveIdStub);
  });

  it('upload a certificate file on drive and save info to user', async () => {
    const params = { _id: new ObjectID(), driveId: '1234567890' };
    const payload = {
      fileName: 'test',
      type: 'certificates',
      'Content-type': 'application/pdf',
      file: 'Ceci est un fichier',
    };

    const result = await UsersHelper.createAndSaveFile(params, payload);

    expect(result).toEqual(uploadedFile);
    sinon.assert.calledWithExactly(addFileStub, {
      driveFolderId: params.driveId,
      name: payload.fileName,
      type: payload['Content-Type'],
      body: payload.file,
    });
    sinon.assert.calledWithExactly(saveCertificateDriveIdStub, params._id, {
      driveId: uploadedFile.id,
      link: uploadedFile.webViewLink,
    });
    sinon.assert.notCalled(saveFileStub);
  });
});

describe('createUser', () => {
  let userFindOne;
  let roleFindById;
  let userCreate;
  let userFindOneAndUpdate;
  let objectIdStub;
  let createHistoryStub;
  let momentToDate;
  const userId = new ObjectID();
  const roleId = new ObjectID();

  beforeEach(() => {
    userFindOne = sinon.stub(User, 'findOne');
    roleFindById = sinon.stub(Role, 'findById');
    userCreate = sinon.stub(User, 'create');
    userFindOneAndUpdate = sinon.stub(User, 'findOneAndUpdate');
    objectIdStub = sinon.stub(mongoose.Types, 'ObjectId').returns(userId);
    createHistoryStub = sinon.stub(SectorHistoriesHelper, 'createHistory');
    momentToDate = sinon.stub(momentProto, 'toDate');
  });

  afterEach(() => {
    userFindOne.restore();
    roleFindById.restore();
    userCreate.restore();
    userFindOneAndUpdate.restore();
    objectIdStub.restore();
    createHistoryStub.restore();
    momentToDate.restore();
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
    sinon.assert.notCalled(userFindOne);
    sinon.assert.notCalled(roleFindById);
    sinon.assert.calledOnceWithExactly(userCreate, { ...payload, refreshToken: sinon.match.string });
  });

  it('client admin - should create an auxiliary for his organization and handles sector', async () => {
    const companyId = new ObjectID();
    const payload = {
      identity: { lastname: 'Test' },
      local: { email: 'toto@test.com' },
      role: roleId,
      sector: new ObjectID(),
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
      [{ _id: roleId, name: 'auxiliary', interface: 'client' }],
      ['lean']
    ));
    userCreate.returns(newUser);
    userFindOne.returns(SinonMongoose.stubChainedQueries([newUser], ['populate', 'lean']));

    const result = await UsersHelper.createUser(payload, { company: { _id: companyId } });

    expect(result).toEqual(newUser);
    sinon.assert.calledWithExactly(createHistoryStub, { _id: userId, sector: payload.sector }, companyId);
    SinonMongoose.calledWithExactly(
      roleFindById,
      [{ query: 'findById', args: [payload.role, { name: 1, interface: 1 }] }, { query: 'lean' }]
    );
    sinon.assert.calledOnceWithExactly(
      userCreate,
      {
        identity: { lastname: 'Test' },
        local: { email: 'toto@test.com' },
        origin: WEBAPP,
        company: companyId,
        refreshToken: sinon.match.string,
        role: { client: roleId },
      }
    );
    SinonMongoose.calledWithExactly(
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
    const companyId = new ObjectID();
    const payload = {
      identity: { lastname: 'Test', firstname: 'Toto' },
      local: { email: 'toto@test.com' },
      role: { client: roleId },
      origin: WEBAPP,
    };
    const newUser = { ...payload, _id: userId, role: { _id: roleId, name: 'coach' } };

    roleFindById.returns(SinonMongoose.stubChainedQueries(
      [{ _id: roleId, name: 'coach', interface: 'client' }],
      ['lean']
    ));
    userCreate.returns(newUser);
    userFindOne.returns(SinonMongoose.stubChainedQueries([newUser], ['populate', 'lean']));

    const result = await UsersHelper.createUser(payload, { company: { _id: companyId } });

    expect(result).toEqual(newUser);
    sinon.assert.notCalled(createHistoryStub);
    SinonMongoose.calledWithExactly(
      roleFindById,
      [{ query: 'findById', args: [payload.role, { name: 1, interface: 1 }] }, { query: 'lean' }]
    );
    sinon.assert.calledOnceWithExactly(
      userCreate,
      {
        ...payload,
        company: companyId,
        refreshToken: sinon.match.string,
      }
    );
    SinonMongoose.calledWithExactly(
      userFindOne,
      [
        { query: 'findOne', args: [{ _id: userId }] },
        { query: 'populate', args: [{ path: 'sector', select: '_id sector', match: { company: companyId } }] },
        { query: 'lean', args: [{ virtuals: true, autopopulate: true }] },
      ]
    );
  });

  it('vendor admin - should create a client admin with company', async () => {
    const companyId = new ObjectID();
    const payload = {
      identity: { lastname: 'Admin', firstname: 'Toto' },
      local: { email: 'admin@test.com' },
      role: roleId,
      company: new ObjectID(),
      origin: WEBAPP,
    };
    const newUser = { ...payload, _id: userId, role: { _id: roleId, name: 'client_admin' } };

    roleFindById.returns(SinonMongoose.stubChainedQueries(
      [{ _id: roleId, name: 'client_admin', interface: 'client' }],
      ['lean']
    ));
    userCreate.returns(newUser);
    userFindOne.returns(SinonMongoose.stubChainedQueries([newUser], ['populate', 'lean']));

    const result = await UsersHelper.createUser(payload, { company: { _id: companyId } });

    expect(result).toEqual(newUser);
    SinonMongoose.calledWithExactly(
      roleFindById,
      [{ query: 'findById', args: [payload.role, { name: 1, interface: 1 }] }, { query: 'lean' }]
    );
    sinon.assert.calledOnceWithExactly(
      userCreate,
      { ...payload, role: { client: roleId }, refreshToken: sinon.match.string }
    );
    SinonMongoose.calledWithExactly(
      userFindOne,
      [
        { query: 'findOne', args: [{ _id: userId }] },
        { query: 'populate', args: [{ path: 'sector', select: '_id sector', match: { company: payload.company } }] },
        { query: 'lean', args: [{ virtuals: true, autopopulate: true }] },
      ]
    );
  });

  it('vendor admin - should create a trainer without company', async () => {
    const companyId = new ObjectID();
    const payload = {
      identity: { lastname: 'Admin', firstname: 'Toto' },
      local: { email: 'trainer@test.com' },
      role: roleId,
      origin: WEBAPP,
    };
    const newUser = { ...payload, _id: userId, role: { _id: roleId, name: 'trainer' } };

    roleFindById.returns(SinonMongoose.stubChainedQueries(
      [{ _id: roleId, name: 'trainer', interface: 'vendor' }],
      ['lean']
    ));
    userCreate.returns(newUser);

    const result = await UsersHelper.createUser(payload, { company: { _id: companyId } });

    expect(result).toEqual(newUser);
    sinon.assert.notCalled(userFindOne);
    SinonMongoose.calledWithExactly(
      roleFindById,
      [{ query: 'findById', args: [payload.role, { name: 1, interface: 1 }] }, { query: 'lean' }]
    );
    sinon.assert.calledOnceWithExactly(
      userCreate,
      { ...payload, role: { vendor: roleId }, refreshToken: sinon.match.string }
    );
  });

  it('vendor admin - should create a user without role but with company', async () => {
    const companyId = new ObjectID();
    const payload = {
      identity: { lastname: 'Test', firstname: 'Toto' },
      local: { email: 'toto@test.com' },
      company: new ObjectID(),
      origin: WEBAPP,
    };
    const newUser = { ...payload, _id: userId };

    userCreate.returns(newUser);

    const result = await UsersHelper.createUser(payload, { company: { _id: companyId } });
    expect(result).toEqual(newUser);

    sinon.assert.notCalled(createHistoryStub);
    sinon.assert.notCalled(roleFindById);
    sinon.assert.notCalled(userFindOne);
    sinon.assert.calledOnceWithExactly(userCreate, { ...payload, refreshToken: sinon.match.string });
  });

  it('should return a 400 error if role does not exist', async () => {
    const companyId = new ObjectID();
    const payload = {
      identity: { lastname: 'Test', firstname: 'Toto' },
      local: { email: 'toto@test.com' },
      role: roleId,
      origin: WEBAPP,
    };
    try {
      roleFindById.returns(SinonMongoose.stubChainedQueries([null], ['lean']));

      await UsersHelper.createUser(payload, { company: { _id: companyId } });
    } catch (e) {
      expect(e).toEqual(Boom.badRequest('Le rôle n\'existe pas'));
    } finally {
      sinon.assert.notCalled(createHistoryStub);
      sinon.assert.notCalled(userCreate);
      SinonMongoose.calledWithExactly(
        roleFindById,
        [{ query: 'findById', args: [payload.role, { name: 1, interface: 1 }] }, { query: 'lean' }]
      );
    }
  });
});

describe('removeHelper', () => {
  let roleFindOne;
  let userFindOneAndUpdate;

  const user = { _id: new ObjectID() };
  const roleId = new ObjectID();

  beforeEach(() => {
    roleFindOne = sinon.stub(Role, 'findOne');
    userFindOneAndUpdate = sinon.stub(User, 'findOneAndUpdate');
  });
  afterEach(() => {
    roleFindOne.restore();
    userFindOneAndUpdate.restore();
  });

  it('should remove client role and customers', async () => {
    roleFindOne.returns(SinonMongoose.stubChainedQueries([{ _id: roleId }], ['lean']));

    userFindOneAndUpdate.returns(SinonMongoose.stubChainedQueries([], []));

    await UsersHelper.removeHelper({ ...user, role: { vendor: new ObjectID() } });

    SinonMongoose.calledWithExactly(roleFindOne, [
      { query: 'findOne', args: [{ name: 'trainer' }] },
      { query: 'lean', args: [] },
    ]);
    SinonMongoose.calledWithExactly(userFindOneAndUpdate, [
      {
        query: 'findOneAndUpdate',
        args: [{ _id: user._id }, { $set: { customers: [] }, $unset: { 'role.client': '' } }],
      },
    ]);
  });

  it('should remove client role and customers and company if user is trainer', async () => {
    roleFindOne.returns(SinonMongoose.stubChainedQueries([{ _id: roleId }], ['lean']));

    userFindOneAndUpdate.returns(SinonMongoose.stubChainedQueries([], []));

    await UsersHelper.removeHelper({ ...user, role: { vendor: roleId } });

    SinonMongoose.calledWithExactly(roleFindOne, [
      { query: 'findOne', args: [{ name: 'trainer' }] },
      { query: 'lean', args: [] },
    ]);
    SinonMongoose.calledWithExactly(userFindOneAndUpdate, [
      {
        query: 'findOneAndUpdate',
        args: [{ _id: user._id }, { $set: { customers: [] }, $unset: { 'role.client': '', company: '' } }],
      },
    ]);
  });
});

describe('updateUser', () => {
  let userUpdateOne;
  let roleFindById;
  let updateHistoryOnSectorUpdateStub;
  const credentials = { company: { _id: new ObjectID() } };
  const userId = new ObjectID();

  beforeEach(() => {
    userUpdateOne = sinon.stub(User, 'updateOne');
    roleFindById = sinon.stub(Role, 'findById');
    updateHistoryOnSectorUpdateStub = sinon.stub(SectorHistoriesHelper, 'updateHistoryOnSectorUpdate');
  });
  afterEach(() => {
    userUpdateOne.restore();
    roleFindById.restore();
    updateHistoryOnSectorUpdateStub.restore();
  });

  it('should update a user', async () => {
    const payload = { identity: { firstname: 'Titi' } };

    userUpdateOne.returns(SinonMongoose.stubChainedQueries([], []));

    await UsersHelper.updateUser(userId, payload, credentials);

    SinonMongoose.calledWithExactly(userUpdateOne, [
      { query: 'updateOne', args: [{ _id: userId, company: credentials.company._id }, { $set: flat(payload) }] },
    ]);
    sinon.assert.notCalled(roleFindById);
    sinon.assert.notCalled(updateHistoryOnSectorUpdateStub);
  });

  it('should update a user without company', async () => {
    const payload = { identity: { firstname: 'Titi' } };

    userUpdateOne.returns(SinonMongoose.stubChainedQueries([], []));

    await UsersHelper.updateUser(userId, payload, credentials, true);

    SinonMongoose.calledWithExactly(userUpdateOne, [
      { query: 'updateOne', args: [{ _id: userId }, { $set: flat(payload) }] },
    ]);
    sinon.assert.notCalled(roleFindById);
    sinon.assert.notCalled(updateHistoryOnSectorUpdateStub);
  });

  it('should update a user and create sector history', async () => {
    const payload = { identity: { firstname: 'Titi' }, sector: new ObjectID() };

    userUpdateOne.returns(SinonMongoose.stubChainedQueries([], []));

    await UsersHelper.updateUser(userId, payload, credentials);

    SinonMongoose.calledWithExactly(userUpdateOne, [
      { query: 'updateOne', args: [{ _id: userId, company: credentials.company._id }, { $set: flat(payload) }] },
    ]);
    sinon.assert.calledWithExactly(updateHistoryOnSectorUpdateStub, userId, payload.sector, credentials.company._id);
    sinon.assert.notCalled(roleFindById);
  });

  it('should update a user role', async () => {
    const payload = { role: new ObjectID() };
    const payloadWithRole = { 'role.client': payload.role.toHexString() };

    userUpdateOne.returns(SinonMongoose.stubChainedQueries([], []));

    roleFindById.returns(SinonMongoose.stubChainedQueries(
      [{ _id: payload.role, name: 'test', interface: 'client' }],
      ['lean']
    ));

    await UsersHelper.updateUser(userId, payload, credentials);

    SinonMongoose.calledWithExactly(userUpdateOne, [
      { query: 'updateOne', args: [{ _id: userId, company: credentials.company._id }, { $set: payloadWithRole }] },
    ]);
    SinonMongoose.calledWithExactly(roleFindById, [
      { query: 'findById', args: [payload.role, { name: 1, interface: 1 }] },
      { query: 'lean', args: [] },
    ]);
    sinon.assert.notCalled(updateHistoryOnSectorUpdateStub);
  });

  it('should return a 400 error if role does not exists', async () => {
    const payload = { role: new ObjectID() };

    roleFindById.returns(SinonMongoose.stubChainedQueries([null], ['lean']));

    try {
      await UsersHelper.updateUser(userId, payload, credentials);
    } catch (e) {
      expect(e).toEqual(Boom.badRequest('Le rôle n\'existe pas'));
    } finally {
      SinonMongoose.calledWithExactly(roleFindById, [
        { query: 'findById', args: [payload.role, { name: 1, interface: 1 }] },
        { query: 'lean', args: [] },
      ]);
      sinon.assert.notCalled(userUpdateOne);
      sinon.assert.notCalled(updateHistoryOnSectorUpdateStub);
    }
  });
});

describe('updateUserCertificates', async () => {
  let updateOne;
  const credentials = { company: { _id: new ObjectID() } };
  beforeEach(() => {
    updateOne = sinon.stub(User, 'updateOne');
  });
  afterEach(() => {
    updateOne.restore();
  });

  it('should update a user certificate', async () => {
    const payload = { certificates: { driveId: '1234567890' } };
    const userId = new ObjectID();

    await UsersHelper.updateUserCertificates(userId, payload, credentials);

    sinon.assert.calledWithExactly(
      updateOne,
      { _id: userId, company: credentials.company._id },
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
    const userId = new ObjectID();
    const endDate = '2019-02-12T00:00:00';
    const credentials = { company: { _id: '1234567890' } };

    countDocuments.returns(0);

    await UsersHelper.updateUserInactivityDate(userId, endDate, credentials);
    sinon.assert.calledWithExactly(
      countDocuments,
      { user: userId, company: '1234567890', $or: [{ endDate: { $exists: false } }, { endDate: null }] }
    );
    sinon.assert.calledWithExactly(
      updateOne,
      { _id: userId },
      { $set: { inactivityDate: moment(endDate).add('1', 'month').startOf('M').toDate() } }
    );
  });

  it('should not update user inactivity date', async () => {
    const userId = new ObjectID();
    const endDate = '2019-02-12T00:00:00';
    const credentials = { company: { _id: '1234567890' } };

    countDocuments.returns(2);

    await UsersHelper.updateUserInactivityDate(userId, endDate, credentials);
    sinon.assert.calledWithExactly(
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

    const userId = new ObjectID();
    const payload = { file: new ArrayBuffer(32), fileName: 'illustration' };

    await UsersHelper.uploadPicture(userId, payload);

    sinon.assert.calledOnceWithExactly(uploadUserMedia, { file: new ArrayBuffer(32), fileName: 'illustration' });
    sinon.assert.calledWithExactly(
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
    const userId = new ObjectID();
    await UsersHelper.deletePicture(userId, '');

    sinon.assert.notCalled(updateOne);
    sinon.assert.notCalled(deleteUserMedia);
  });

  it('should update user and delete media', async () => {
    const userId = new ObjectID();
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
  let companyFindOne;
  let createFolder;
  let userUpdateOne;
  beforeEach(() => {
    companyFindOne = sinon.stub(Company, 'findOne');
    createFolder = sinon.stub(GdriveStorageHelper, 'createFolder');
    userUpdateOne = sinon.stub(User, 'updateOne');
  });
  afterEach(() => {
    companyFindOne.restore();
    createFolder.restore();
    userUpdateOne.restore();
  });

  it('should create a google drive folder and update user', async () => {
    const user = { _id: new ObjectID(), company: new ObjectID(), identity: { lastname: 'Delenda' } };

    companyFindOne.returns(SinonMongoose.stubChainedQueries(
      [{ auxiliariesFolderId: 'auxiliariesFolderId' }],
      ['lean']
    ));

    createFolder.returns({ webViewLink: 'webViewLink', id: 'folderId' });

    await UsersHelper.createDriveFolder(user);

    SinonMongoose.calledWithExactly(companyFindOne, [
      { query: 'findOne', args: [{ _id: user.company }, { auxiliariesFolderId: 1 }] },
      { query: 'lean', args: [] },
    ]);
    sinon.assert.calledOnceWithExactly(createFolder, { lastname: 'Delenda' }, 'auxiliariesFolderId');
    sinon.assert.calledOnceWithExactly(
      userUpdateOne,
      { _id: user._id },
      { $set: { 'administrative.driveFolder.link': 'webViewLink', 'administrative.driveFolder.driveId': 'folderId' } }
    );
  });

  it('should return a 422 if user has no company', async () => {
    const user = { _id: new ObjectID(), company: new ObjectID() };
    try {
      companyFindOne.returns(SinonMongoose.stubChainedQueries([null], ['lean']));

      await UsersHelper.createDriveFolder(user);
    } catch (e) {
      expect(e.output.statusCode).toEqual(422);
    } finally {
      SinonMongoose.calledWithExactly(companyFindOne, [
        { query: 'findOne', args: [{ _id: user.company }, { auxiliariesFolderId: 1 }] },
        { query: 'lean', args: [] },
      ]);
      sinon.assert.notCalled(createFolder);
      sinon.assert.notCalled(userUpdateOne);
    }
  });

  it('should return a 422 if user company has no auxialiaries folder Id', async () => {
    const user = { _id: new ObjectID(), company: new ObjectID() };
    try {
      companyFindOne.returns(SinonMongoose.stubChainedQueries([{ _id: user.company }], ['lean']));

      await UsersHelper.createDriveFolder(user);
    } catch (e) {
      expect(e.output.statusCode).toEqual(422);
    } finally {
      SinonMongoose.calledWithExactly(companyFindOne, [
        { query: 'findOne', args: [{ _id: user.company }, { auxiliariesFolderId: 1 }] },
        { query: 'lean', args: [] },
      ]);
      sinon.assert.notCalled(createFolder);
      sinon.assert.notCalled(userUpdateOne);
    }
  });
});
