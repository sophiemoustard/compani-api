const mongoose = require('mongoose');
const { ObjectID } = require('mongodb');
const get = require('lodash/get');
const expect = require('expect');
const moment = require('moment');
const sinon = require('sinon');
const Boom = require('@hapi/boom');
const flat = require('flat');
const bcrypt = require('bcrypt');
const omit = require('lodash/omit');
const uuid = require('uuid');
const UsersHelper = require('../../../src/helpers/users');
const SectorHistoriesHelper = require('../../../src/helpers/sectorHistories');
const AuthenticationHelper = require('../../../src/helpers/authentication');
const EmailHelper = require('../../../src/helpers/email');
const translate = require('../../../src/helpers/translate');
const { TOKEN_EXPIRE_TIME } = require('../../../src/models/User');
const GdriveStorageHelper = require('../../../src/helpers/gdriveStorage');
const User = require('../../../src/models/User');
const Contract = require('../../../src/models/Contract');
const Role = require('../../../src/models/Role');
const Task = require('../../../src/models/Task');

require('sinon-mongoose');

const { language } = translate;

describe('authenticate', () => {
  let UserMock;
  let compare;
  let encode;
  beforeEach(() => {
    UserMock = sinon.mock(User);
    compare = sinon.stub(bcrypt, 'compare');
    encode = sinon.stub(AuthenticationHelper, 'encode');
  });
  afterEach(() => {
    UserMock.restore();
    compare.restore();
    encode.restore();
  });

  it('should throw an error if user does not exist', async () => {
    try {
      const payload = { email: 'toto@email.com', password: 'toto' };
      UserMock.expects('findOne')
        .withExactArgs({ 'local.email': payload.email.toLowerCase() })
        .chain('lean')
        .withExactArgs({ autopopulate: true })
        .once()
        .returns(null);

      await UsersHelper.authenticate(payload);
    } catch (e) {
      expect(e.output.statusCode).toEqual(401);
    } finally {
      UserMock.verify();
      sinon.assert.notCalled(compare);
      sinon.assert.notCalled(encode);
    }
  });
  it('should throw an error if refresh token does not exist', async () => {
    try {
      const payload = { email: 'toto@email.com', password: 'toto' };
      UserMock.expects('findOne')
        .withExactArgs({ 'local.email': payload.email.toLowerCase() })
        .chain('lean')
        .withExactArgs({ autopopulate: true })
        .once()
        .returns({ _id: new ObjectID() });

      await UsersHelper.authenticate(payload);
    } catch (e) {
      expect(e.output.statusCode).toEqual(401);
    } finally {
      UserMock.verify();
      sinon.assert.notCalled(compare);
      sinon.assert.notCalled(encode);
    }
  });
  it('should throw an error if wrong password', async () => {
    const payload = { email: 'toto@email.com', password: 'toto' };
    try {
      UserMock.expects('findOne')
        .withExactArgs({ 'local.email': payload.email.toLowerCase() })
        .chain('lean')
        .withExactArgs({ autopopulate: true })
        .once()
        .returns({ _id: new ObjectID(), refreshToken: 'token', local: { password: 'password_hash' } });
      compare.returns(false);

      await UsersHelper.authenticate(payload);
    } catch (e) {
      expect(e.output.statusCode).toEqual(401);
    } finally {
      UserMock.verify();
      sinon.assert.calledWithExactly(compare, payload.password, 'password_hash');
      sinon.assert.notCalled(encode);
    }
  });
  it('should return authentication data', async () => {
    const payload = { email: 'toto@email.com', password: 'toto' };
    const user = {
      _id: new ObjectID(),
      refreshToken: 'token',
      local: { password: 'toto' },
    };
    UserMock.expects('findOne')
      .withExactArgs({ 'local.email': payload.email.toLowerCase() })
      .chain('lean')
      .withExactArgs({ autopopulate: true })
      .once()
      .returns(user);
    compare.returns(true);
    encode.returns('token');

    const result = await UsersHelper.authenticate(payload);

    expect(result).toEqual({
      token: 'token',
      refreshToken: user.refreshToken,
      expiresIn: TOKEN_EXPIRE_TIME,
      user: { _id: user._id.toHexString() },
    });
    UserMock.verify();
    sinon.assert.calledWithExactly(compare, payload.password, 'toto');
    sinon.assert.calledWithExactly(
      encode,
      { _id: user._id.toHexString() },
      TOKEN_EXPIRE_TIME
    );
  });
});

describe('refreshToken', () => {
  let UserMock;
  let encode;
  beforeEach(() => {
    UserMock = sinon.mock(User);
    encode = sinon.stub(AuthenticationHelper, 'encode');
  });
  afterEach(() => {
    UserMock.restore();
    encode.restore();
  });

  it('should throw an error if user does not exist', async () => {
    try {
      const payload = { refreshToken: 'token' };
      UserMock.expects('findOne')
        .withExactArgs({ refreshToken: payload.refreshToken })
        .chain('lean')
        .withExactArgs({ autopopulate: true })
        .once()
        .returns(null);

      await UsersHelper.refreshToken(payload);
    } catch (e) {
      expect(e).toEqual(Boom.unauthorized());
    } finally {
      UserMock.verify();
      sinon.assert.notCalled(encode);
    }
  });
  it('should return refresh token', async () => {
    const payload = { refreshToken: 'token' };
    const user = {
      _id: new ObjectID(),
      refreshToken: 'token',
      local: { password: 'toto' },
    };
    UserMock.expects('findOne')
      .withExactArgs({ refreshToken: payload.refreshToken })
      .chain('lean')
      .withExactArgs({ autopopulate: true })
      .once()
      .returns(user);
    encode.returns('token');

    const result = await UsersHelper.refreshToken(payload);

    expect(result).toEqual({
      token: 'token',
      refreshToken: user.refreshToken,
      expiresIn: TOKEN_EXPIRE_TIME,
      user: { _id: user._id.toHexString() },
    });
    UserMock.verify();
    sinon.assert.calledWithExactly(encode, { _id: user._id.toHexString() }, TOKEN_EXPIRE_TIME);
  });
});

describe('formatQueryForUsersList', () => {
  let RoleMock;
  const credentials = { company: { _id: new ObjectID() }, _id: new ObjectID() };
  const companyId = credentials.company._id;

  beforeEach(() => {
    RoleMock = sinon.mock(Role);
  });

  afterEach(() => {
    RoleMock.restore();
  });

  it('should returns params without role if no role in query', async () => {
    const query = { company: companyId };
    RoleMock.expects('find').never();

    const result = await UsersHelper.formatQueryForUsersList(query);

    expect(result).toEqual(query);
    RoleMock.verify();
  });

  it('should return params with role', async () => {
    const query = { company: companyId, role: [{ _id: new ObjectID() }, { _id: new ObjectID() }] };
    const roles = [{ _id: query.role[0]._id, interface: 'vendor' }, { _id: query.role[1]._id, interface: 'vendor' }];

    RoleMock
      .expects('find')
      .withExactArgs({ name: { $in: query.role } }, { _id: 1, interface: 1 })
      .chain('lean')
      .returns(roles);

    const result = await UsersHelper.formatQueryForUsersList(query);
    expect(result).toEqual({
      company: companyId,
      'role.vendor': { $in: [query.role[0]._id, query.role[1]._id] },
    });
    RoleMock.verify();
  });

  it('should return 404 if role does not exist', async () => {
    try {
      const query = { company: companyId, role: [{ _id: new ObjectID() }, { _id: new ObjectID() }] };

      RoleMock
        .expects('find')
        .withExactArgs({ name: { $in: query.role } }, { _id: 1, interface: 1 })
        .chain('lean')
        .returns([]);

      const result = await UsersHelper.formatQueryForUsersList(query);
      expect(result).toBeUndefined();
    } catch (e) {
      expect(e).toEqual(Boom.notFound(translate[language].roleNotFound));
    } finally {
      RoleMock.verify();
    }
  });
});

describe('getUsersList', () => {
  let UserMock;
  let formatQueryForUsersListStub;
  const users = [{ _id: new ObjectID() }, { _id: new ObjectID() }];
  const credentials = { company: { _id: new ObjectID() }, _id: new ObjectID() };
  const companyId = credentials.company._id;

  beforeEach(() => {
    UserMock = sinon.mock(User);
    formatQueryForUsersListStub = sinon.stub(UsersHelper, 'formatQueryForUsersList');
  });

  afterEach(() => {
    UserMock.restore();
    formatQueryForUsersListStub.restore();
  });

  it('should get users', async () => {
    const query = { email: 'toto@test.com', company: companyId };

    formatQueryForUsersListStub.returns(query);

    UserMock
      .expects('find')
      .withExactArgs({ ...query, company: companyId }, {}, { autopopulate: false })
      .chain('populate')
      .withExactArgs({ path: 'procedure.task', select: 'name' })
      .chain('populate')
      .withExactArgs({ path: 'customers', select: 'identity driveFolder' })
      .chain('populate')
      .withExactArgs({ path: 'role.client', select: '-rights -__v -createdAt -updatedAt' })
      .chain('populate')
      .withExactArgs({
        path: 'sector',
        select: '_id sector',
        match: { company: credentials.company._id },
      })
      .chain('populate')
      .withExactArgs('contracts')
      .chain('setOptions')
      .withExactArgs({ isVendorUser: false })
      .chain('lean')
      .withExactArgs({ virtuals: true, autopopulate: true })
      .returns(users);

    const result = await UsersHelper.getUsersList(query, { ...credentials, role: { client: 'test' } });
    expect(result).toEqual(users);
    sinon.assert.calledWithExactly(formatQueryForUsersListStub, query);
    UserMock.verify();
  });

  it('should get users according to roles', async () => {
    const query = { role: ['auxiliary', 'planning_referent'], company: companyId };
    const roles = [new ObjectID(), new ObjectID()];
    const formattedQuery = {
      company: companyId,
      'role.client': { $in: roles },
    };
    formatQueryForUsersListStub.returns(formattedQuery);

    UserMock
      .expects('find')
      .withExactArgs(formattedQuery, {}, { autopopulate: false })
      .chain('populate')
      .withExactArgs({ path: 'procedure.task', select: 'name' })
      .chain('populate')
      .withExactArgs({ path: 'customers', select: 'identity driveFolder' })
      .chain('populate')
      .withExactArgs({ path: 'role.client', select: '-rights -__v -createdAt -updatedAt' })
      .chain('populate')
      .withExactArgs({
        path: 'sector',
        select: '_id sector',
        match: { company: credentials.company._id },
      })
      .chain('populate')
      .withExactArgs('contracts')
      .chain('setOptions')
      .withExactArgs({ isVendorUser: false })
      .chain('lean')
      .withExactArgs({ virtuals: true, autopopulate: true })
      .returns(users);

    const result = await UsersHelper.getUsersList(query, { ...credentials, role: { client: 'test' } });
    expect(result).toEqual(users);
    sinon.assert.calledWithExactly(formatQueryForUsersListStub, query);
    UserMock.verify();
  });
});

describe('getUsersListWithSectorHistories', () => {
  let UserMock;
  let formatQueryForUsersListStub;
  const users = [{ _id: new ObjectID() }, { _id: new ObjectID() }];
  const credentials = { company: { _id: new ObjectID() }, _id: new ObjectID() };
  const companyId = credentials.company._id;

  beforeEach(() => {
    UserMock = sinon.mock(User);
    formatQueryForUsersListStub = sinon.stub(UsersHelper, 'formatQueryForUsersList');
  });

  afterEach(() => {
    UserMock.restore();
    formatQueryForUsersListStub.restore();
  });

  it('should get users', async () => {
    const query = { company: companyId };
    const roles = [new ObjectID(), new ObjectID()];

    const formattedQuery = {
      company: companyId,
      'role.client': { $in: roles },
    };
    formatQueryForUsersListStub.returns(formattedQuery);

    UserMock
      .expects('find')
      .withExactArgs(formattedQuery, {}, { autopopulate: false })
      .chain('populate')
      .withExactArgs({ path: 'role.client', select: '-rights -__v -createdAt -updatedAt' })
      .chain('populate')
      .withExactArgs({
        path: 'sectorHistories',
        select: '_id sector startDate endDate',
        match: { company: get(credentials, 'company._id', null) },
      })
      .chain('populate')
      .withExactArgs('contracts')
      .chain('setOptions')
      .withExactArgs({ isVendorUser: false })
      .chain('lean')
      .withExactArgs({ virtuals: true, autopopulate: true })
      .returns(users);

    const result = await UsersHelper.getUsersListWithSectorHistories(
      query,
      { ...credentials, role: { client: 'test' } }
    );
    expect(result).toEqual(users);
    sinon.assert.calledWithExactly(formatQueryForUsersListStub, { ...query, role: ['auxiliary', 'planning_referent'] });
    UserMock.verify();
  });
});

describe('getUser', () => {
  let userMock;
  const credentials = { company: { _id: new ObjectID() } };
  beforeEach(() => {
    userMock = sinon.mock(User);
  });
  afterEach(() => {
    userMock.restore();
  });

  it('should return user without populating role', async () => {
    const userId = new ObjectID();
    const user = { _id: userId, role: { name: 'helper', rights: [] } };
    userMock.expects('findOne')
      .withExactArgs({ _id: userId })
      .chain('populate')
      .withExactArgs('customers')
      .chain('populate')
      .withExactArgs('contracts')
      .chain('populate')
      .withExactArgs({ path: 'procedure.task', select: 'name _id' })
      .chain('populate')
      .withExactArgs({ path: 'sector', select: '_id sector', match: { company: credentials.company._id } })
      .chain('lean')
      .withExactArgs({ autopopulate: true, virtuals: true })
      .once()
      .returns(user);

    await UsersHelper.getUser(userId, credentials);

    userMock.verify();
  });

  it('should return user and populate role', async () => {
    const userId = new ObjectID();
    const rightId = new ObjectID();
    const user = { _id: userId, role: { name: 'helper', rights: [{ _id: rightId }] } };
    userMock.expects('findOne')
      .withExactArgs({ _id: userId })
      .chain('populate')
      .withExactArgs('customers')
      .chain('populate')
      .withExactArgs('contracts')
      .chain('populate')
      .withExactArgs({ path: 'procedure.task', select: 'name _id' })
      .chain('populate')
      .withExactArgs({ path: 'sector', select: '_id sector', match: { company: credentials.company._id } })
      .chain('lean')
      .withExactArgs({ autopopulate: true, virtuals: true })
      .once()
      .returns(user);

    await UsersHelper.getUser(userId, credentials);

    userMock.verify();
  });

  it('should throw error if user not found', async () => {
    try {
      const userId = new ObjectID();
      userMock.expects('findOne')
        .withExactArgs({ _id: userId })
        .chain('populate')
        .withExactArgs('customers')
        .chain('populate')
        .withExactArgs('contracts')
        .chain('populate')
        .withExactArgs({ path: 'procedure.task', select: 'name _id' })
        .chain('populate')
        .withExactArgs({ path: 'sector', select: '_id sector', match: { company: credentials.company._id } })
        .chain('lean')
        .withExactArgs({ autopopulate: true, virtuals: true })
        .once()
        .returns(null);

      await UsersHelper.getUser(userId, credentials);
    } catch (e) {
      expect(e.output.statusCode).toEqual(404);
    } finally {
      userMock.verify();
    }
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
  let UserMock;
  let TaskMock;
  let RoleMock;
  let objectIdStub;
  let createHistoryStub;
  const userId = new ObjectID();
  const roleId = new ObjectID();
  const credentials = { company: { _id: new ObjectID() } };

  beforeEach(() => {
    UserMock = sinon.mock(User);
    TaskMock = sinon.mock(Task);
    RoleMock = sinon.mock(Role);
    objectIdStub = sinon.stub(mongoose.Types, 'ObjectId').returns(userId);
    createHistoryStub = sinon.stub(SectorHistoriesHelper, 'createHistory');
  });

  afterEach(() => {
    UserMock.restore();
    TaskMock.restore();
    RoleMock.restore();
    objectIdStub.restore();
    createHistoryStub.restore();
  });

  it('should create an auxiliary', async () => {
    const payload = {
      identity: { lastname: 'Test', firstname: 'Toto' },
      local: { email: 'toto@test.com', password: '1234567890' },
      role: { client: roleId },
      sector: new ObjectID(),
    };
    const newUser = {
      ...payload,
      role: { client: { _id: roleId, name: 'auxiliary', rights: [{ _id: new ObjectID() }] } },
    };
    const tasks = [{ _id: new ObjectID() }, { _id: new ObjectID() }];
    const taskIds = tasks.map(task => ({ task: task._id }));
    const newUserWithProcedure = {
      ...newUser,
      procedure: [
        { task: tasks[0]._id, isDone: false, at: null },
        { task: tasks[1]._id, isDone: false, at: null },
      ],
    };

    RoleMock.expects('findById')
      .withExactArgs(payload.role, { name: 1, interface: 1 })
      .chain('lean')
      .returns({ _id: roleId, name: 'auxiliary', interface: 'client' });

    TaskMock.expects('find').chain('lean').returns(tasks);

    UserMock.expects('create')
      .withExactArgs({
        ...omit(payload, 'sector'),
        company: credentials.company._id,
        refreshToken: sinon.match.string,
        procedure: taskIds,
      })
      .returns({ ...newUserWithProcedure, _id: userId });

    UserMock.expects('findOne')
      .withExactArgs({ _id: userId })
      .chain('populate')
      .withExactArgs({
        path: 'sector',
        select: '_id sector',
        match: { company: get(credentials, 'company._id', null) },
      })
      .chain('lean')
      .withExactArgs({ virtuals: true, autopopulate: true })
      .returns({ ...newUserWithProcedure });


    const result = await UsersHelper.createUser(payload, credentials);

    expect(result).toMatchObject(newUserWithProcedure);
    RoleMock.verify();
    TaskMock.verify();
    UserMock.verify();
    sinon.assert.calledWithExactly(createHistoryStub, { _id: userId, sector: payload.sector }, credentials.company._id);
  });

  it('should create a coach', async () => {
    const payload = {
      identity: { lastname: 'Test', firstname: 'Toto' },
      local: { email: 'toto@test.com', password: '1234567890' },
      role: { client: roleId },
    };
    const newUser = {
      ...payload,
      role: { _id: roleId, name: 'coach', rights: [{ _id: new ObjectID() }] },
    };

    RoleMock.expects('findById')
      .withExactArgs(payload.role, { name: 1, interface: 1 })
      .chain('lean')
      .returns({ _id: roleId, name: 'coach', interface: 'client' });

    TaskMock.expects('find').never();

    UserMock.expects('create')
      .withExactArgs({
        ...payload,
        company: credentials.company._id,
        refreshToken: sinon.match.string,
      })
      .returns({ ...newUser, _id: userId });

    UserMock.expects('findOne')
      .withExactArgs({ _id: userId })
      .chain('populate')
      .withExactArgs({
        path: 'sector',
        select: '_id sector',
        match: { company: get(credentials, 'company._id', null) },
      })
      .chain('lean')
      .withExactArgs({ virtuals: true, autopopulate: true })
      .returns({ ...newUser });

    const result = await UsersHelper.createUser(payload, credentials);

    expect(result).toMatchObject(newUser);
    RoleMock.verify();
    TaskMock.verify();
    UserMock.verify();
    sinon.assert.notCalled(createHistoryStub);
  });

  it('should create a client admin', async () => {
    const payload = {
      identity: { lastname: 'Admin', firstname: 'Toto' },
      local: { email: 'admin@test.com', password: '1234567890' },
      role: { client: roleId },
      company: new ObjectID(),
    };
    const newUser = {
      ...payload,
      role: { _id: roleId, name: 'client_admin', rights: [{ _id: new ObjectID() }] },
    };

    RoleMock
      .expects('findById')
      .withExactArgs(payload.role, { name: 1, interface: 1 })
      .chain('lean')
      .returns({ _id: roleId, name: 'client_admin', interface: 'client' });

    TaskMock.expects('find').never();

    UserMock.expects('create')
      .withExactArgs({
        ...payload,
        refreshToken: sinon.match.string,
      })
      .returns({ ...newUser, _id: userId });

    UserMock.expects('findOne')
      .withExactArgs({ _id: userId })
      .chain('populate')
      .withExactArgs({
        path: 'sector',
        select: '_id sector',
        match: { company: payload.company },
      })
      .chain('lean')
      .withExactArgs({ virtuals: true, autopopulate: true })
      .returns({ ...newUser });


    const result = await UsersHelper.createUser(payload, credentials);

    expect(result).toMatchObject(newUser);
    RoleMock.verify();
    TaskMock.verify();
    UserMock.verify();
  });

  it('should create a trainer', async () => {
    const payload = {
      identity: { lastname: 'Admin', firstname: 'Toto' },
      local: { email: 'trainer@test.com', password: '1234567890' },
      role: { vendor: roleId },
      company: new ObjectID(),
    };
    const newUser = {
      ...payload,
      role: { _id: roleId, name: 'trainer', rights: [{ _id: new ObjectID() }] },
    };

    RoleMock.expects('findById')
      .withExactArgs(payload.role, { name: 1, interface: 1 })
      .chain('lean')
      .returns({ _id: roleId, name: 'trainer', interface: 'vendor' });

    TaskMock.expects('find').never();

    UserMock.expects('findOne').withExactArgs({ 'local.email': payload.local.email }).chain('lean').returns();

    UserMock.expects('create')
      .withExactArgs({ ...payload, refreshToken: sinon.match.string })
      .returns({ ...newUser, _id: userId });

    UserMock.expects('findOne')
      .withExactArgs({ _id: userId })
      .chain('populate')
      .withExactArgs({
        path: 'sector',
        select: '_id sector',
        match: { company: payload.company },
      })
      .chain('lean')
      .withExactArgs({ virtuals: true, autopopulate: true })
      .returns({ ...newUser });


    const result = await UsersHelper.createUser(payload, credentials);

    expect(result).toMatchObject(newUser);
    RoleMock.verify();
    TaskMock.verify();
    UserMock.verify();
  });

  it('should update a user with trainer role', async () => {
    const payload = {
      identity: { lastname: 'Admin', firstname: 'Toto' },
      local: { email: 'trainer@test.com', password: '1234567890' },
      role: { vendor: roleId },
      company: new ObjectID(),
    };
    const newUser = {
      ...payload,
      role: { _id: roleId, name: 'trainer', rights: [{ _id: new ObjectID() }] },
    };

    RoleMock.expects('findById')
      .withExactArgs(payload.role, { name: 1, interface: 1 })
      .chain('lean')
      .returns({ _id: roleId, name: 'trainer', interface: 'vendor' });

    TaskMock.expects('find').never();

    const userInDB = { _id: new ObjectID(), role: { client: 'blabla' } };
    UserMock.expects('findOne')
      .withExactArgs({ 'local.email': payload.local.email })
      .chain('lean')
      .returns(userInDB);

    UserMock.expects('findOneAndUpdate')
      .withExactArgs({ _id: userInDB._id }, { 'role.vendor': roleId }, { new: true })
      .chain('populate')
      .withExactArgs({
        path: 'sector',
        select: '_id sector',
        match: { company: payload.company },
      })
      .chain('lean')
      .withExactArgs({ virtuals: true, autopopulate: true })
      .returns({ ...newUser });

    const result = await UsersHelper.createUser(payload, credentials);

    expect(result).toMatchObject(newUser);
    RoleMock.verify();
    TaskMock.verify();
    UserMock.verify();
  });

  it('should return an error if user already has vendor role', async () => {
    try {
      const payload = {
        identity: { lastname: 'Admin', firstname: 'Toto' },
        local: { email: 'trainer@test.com', password: '1234567890' },
        role: { vendor: roleId },
        company: new ObjectID(),
      };

      RoleMock.expects('findById')
        .withExactArgs(payload.role, { name: 1, interface: 1 })
        .chain('lean')
        .returns({ _id: roleId, name: 'trainer', interface: 'vendor' });

      TaskMock.expects('find').never();

      const userInDB = { _id: new ObjectID(), role: { vendor: 'blabla' } };
      UserMock.expects('findOne')
        .withExactArgs({ 'local.email': payload.local.email })
        .chain('lean')
        .returns(userInDB);

      UserMock.expects('findOneAndUpdate')
        .never();

      await UsersHelper.createUser(payload, credentials);
    } catch (e) {
      expect(e).toMatchObject(Boom.badRequest());
      RoleMock.verify();
      TaskMock.verify();
      UserMock.verify();
    }
  });

  it('should return a 400 error if role does not exist', async () => {
    try {
      const payload = {
        identity: { lastname: 'Test', firstname: 'Toto' },
        local: { email: 'toto@test.com', password: '1234567890' },
        role: { client: roleId },
      };

      RoleMock.expects('findById')
        .withExactArgs(payload.role, { name: 1, interface: 1 })
        .chain('lean')
        .returns(null);

      TaskMock.expects('find').never();
      UserMock.expects('create').never();

      await UsersHelper.createUser(payload, credentials);
    } catch (e) {
      expect(e).toEqual(Boom.badRequest('Role does not exist'));
    } finally {
      RoleMock.verify();
      UserMock.verify();
      sinon.assert.notCalled(createHistoryStub);
    }
  });
});

describe('updateUser', () => {
  let UserMock;
  let RoleMock;
  let updateHistoryOnSectorUpdateStub;
  const credentials = { company: { _id: new ObjectID() } };
  const userId = new ObjectID();
  const user = {
    _id: userId,
    role: {
      rights: [
        { right_id: { _id: new ObjectID().toHexString(), permission: 'test' }, hasAccess: true },
        { right_id: { _id: new ObjectID().toHexString(), permission: 'test2' }, hasAccess: false },
      ],
    },
  };

  beforeEach(() => {
    UserMock = sinon.mock(User);
    RoleMock = sinon.mock(Role);
    updateHistoryOnSectorUpdateStub = sinon.stub(SectorHistoriesHelper, 'updateHistoryOnSectorUpdate');
  });
  afterEach(() => {
    UserMock.restore();
    RoleMock.restore();
    updateHistoryOnSectorUpdateStub.restore();
  });

  it('should update a user', async () => {
    const payload = { identity: { firstname: 'Titi' } };

    UserMock.expects('findOneAndUpdate')
      .withExactArgs(
        { _id: userId, company: credentials.company._id },
        { $set: flat(payload) },
        { new: true }
      )
      .chain('populate')
      .withExactArgs({ path: 'sector', select: '_id sector', match: { company: credentials.company._id } })
      .chain('lean')
      .withExactArgs({ autopopulate: true, virtuals: true })
      .returns({ ...user, ...payload });

    RoleMock.expects('findById').never();

    const result = await UsersHelper.updateUser(userId, payload, credentials);

    expect(result).toEqual({ ...user, ...payload });
    UserMock.verify();
    RoleMock.verify();
    sinon.assert.notCalled(updateHistoryOnSectorUpdateStub);
  });

  it('should update a user without company', async () => {
    const payload = { identity: { firstname: 'Titi' } };

    UserMock.expects('findOneAndUpdate')
      .withExactArgs(
        { _id: userId },
        { $set: flat(payload) },
        { new: true }
      )
      .chain('populate')
      .withExactArgs({ path: 'sector', select: '_id sector', match: { company: credentials.company._id } })
      .chain('lean')
      .withExactArgs({ autopopulate: true, virtuals: true })
      .returns({ ...user, ...payload });

    RoleMock.expects('findById').never();

    const result = await UsersHelper.updateUser(userId, payload, credentials, true);

    expect(result).toEqual({ ...user, ...payload });
    UserMock.verify();
    RoleMock.verify();
    sinon.assert.notCalled(updateHistoryOnSectorUpdateStub);
  });

  it('should update a user and create sector history', async () => {
    const payload = { identity: { firstname: 'Titi' }, sector: new ObjectID() };

    UserMock.expects('findOneAndUpdate')
      .withExactArgs(
        { _id: userId, company: credentials.company._id },
        { $set: flat(payload) },
        { new: true }
      )
      .chain('populate')
      .withExactArgs({ path: 'sector', select: '_id sector', match: { company: credentials.company._id } })
      .chain('lean')
      .withExactArgs({ autopopulate: true, virtuals: true })
      .returns({ ...user, ...payload });

    RoleMock.expects('findById').never();

    const result = await UsersHelper.updateUser(userId, payload, credentials);

    expect(result).toMatchObject({ ...user, ...payload });
    UserMock.verify();
    RoleMock.verify();
    sinon.assert.calledWithExactly(updateHistoryOnSectorUpdateStub, userId, payload.sector, credentials.company._id);
  });

  it('should update a user role', async () => {
    const payload = { role: new ObjectID() };
    const payloadWithRole = { 'role.client': payload.role.toHexString() };

    UserMock
      .expects('findOneAndUpdate')
      .withExactArgs({ _id: userId, company: credentials.company._id }, { $set: payloadWithRole }, { new: true })
      .chain('populate')
      .withExactArgs({ path: 'sector', select: '_id sector', match: { company: credentials.company._id } })
      .chain('lean')
      .withExactArgs({ autopopulate: true, virtuals: true })
      .returns({ ...user, ...payloadWithRole });

    RoleMock
      .expects('findById')
      .withExactArgs(payload.role, { name: 1, interface: 1 })
      .chain('lean')
      .returns({ _id: payload.role, name: 'test', interface: 'client' });

    const result = await UsersHelper.updateUser(userId, payload, credentials);

    expect(result).toMatchObject({ ...user, ...payloadWithRole });
    UserMock.verify();
    RoleMock.verify();
    sinon.assert.notCalled(updateHistoryOnSectorUpdateStub);
  });

  it('should return a 400 error if role does not exists', async () => {
    const payload = { role: new ObjectID() };

    RoleMock
      .expects('findById')
      .withExactArgs(payload.role, { name: 1, interface: 1 })
      .chain('lean')
      .returns(null);

    UserMock.expects('find').never();

    try {
      await UsersHelper.updateUser(userId, payload, credentials);
    } catch (e) {
      expect(e).toEqual(Boom.badRequest('Role does not exist'));
    } finally {
      RoleMock.verify();
      sinon.assert.notCalled(updateHistoryOnSectorUpdateStub);
    }
  });
});

describe('updateUser', () => {
  let UserMock;
  const credentials = { company: { _id: new ObjectID() } };
  const userId = new ObjectID();
  const user = { _id: userId };

  beforeEach(() => {
    UserMock = sinon.mock(User);
  });
  afterEach(() => {
    UserMock.restore();
  });

  it('should update a user password', async () => {
    const payload = { local: { password: '123456' } };

    UserMock.expects('findOneAndUpdate')
      .withExactArgs({ _id: userId }, { $set: flat(payload) }, { new: true })
      .chain('populate')
      .withExactArgs({ path: 'sector', select: '_id sector', match: { company: credentials.company._id } })
      .chain('lean')
      .withExactArgs({ autopopulate: true, virtuals: true })
      .returns({ ...user, ...payload });


    const result = await UsersHelper.updatePassword(userId, payload, credentials);

    expect(result).toEqual({ ...user, ...payload });
    UserMock.verify();
  });

  it('should update a user password and resetPassword', async () => {
    const payload = { local: { password: '123456' }, isResetPassword: true };
    const userPayload = { local: { password: '123456' }, resetPassword: { expiresIn: null, token: null, from: null } };

    UserMock.expects('findOneAndUpdate')
      .withExactArgs(
        { _id: userId },
        { $set: flat(userPayload) },
        { new: true }
      )
      .chain('populate')
      .withExactArgs({ path: 'sector', select: '_id sector', match: { company: credentials.company._id } })
      .chain('lean')
      .withExactArgs({ autopopulate: true, virtuals: true })
      .returns({ ...user, ...userPayload });


    const result = await UsersHelper.updatePassword(userId, payload, credentials);

    expect(result).toEqual({ ...user, ...userPayload });
    UserMock.verify();
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

describe('checkResetPasswordToken', () => {
  let UserMock;
  let encode;
  let fakeDate;
  const date = new Date('2020-01-13');
  const token = '1234567890';
  const filter = { passwordToken: { token, expiresIn: { $gt: date.getTime() } } };

  beforeEach(() => {
    UserMock = sinon.mock(User);
    encode = sinon.stub(AuthenticationHelper, 'encode');
    fakeDate = sinon.useFakeTimers(date);
  });
  afterEach(() => {
    UserMock.restore();
    encode.restore();
    fakeDate.restore();
  });

  it('should throw an error if user does not exist', async () => {
    try {
      UserMock.expects('findOne')
        .withExactArgs(flat(filter, { maxDepth: 2 }))
        .chain('lean')
        .withExactArgs()
        .once()
        .returns(null);

      await UsersHelper.checkResetPasswordToken(token);
    } catch (e) {
      expect(e).toEqual(Boom.notFound(translate[language].userNotFound));
    } finally {
      UserMock.verify();
      sinon.assert.notCalled(encode);
    }
  });

  it('should return a new access token after checking reset password token', async () => {
    const user = { _id: new ObjectID(), local: { email: 'toto@toto.com' } };
    const userPayload = { _id: user._id, email: user.local.email };

    UserMock.expects('findOne')
      .withExactArgs(flat(filter, { maxDepth: 2 }))
      .chain('lean')
      .withExactArgs()
      .once()
      .returns(user);
    encode.returns(token);

    const result = await UsersHelper.checkResetPasswordToken(token);

    expect(result).toEqual({ token, user: userPayload });
    UserMock.verify();
    sinon.assert.calledWithExactly(encode, userPayload, TOKEN_EXPIRE_TIME);
  });
});

describe('createPasswordToken', () => {
  let updateOne;
  let fakeDate;
  let uuidv4;
  const token = '1234567890';
  const email = 'toto@toto.com';
  const date = new Date('2020-01-13');
  const payload = { passwordToken: { token, expiresIn: date.getTime() + 86400000 } };

  beforeEach(() => {
    updateOne = sinon.stub(User, 'updateOne');
    fakeDate = sinon.useFakeTimers(date);
    uuidv4 = sinon.stub(uuid, 'v4').returns('1234567890');
  });
  afterEach(() => {
    updateOne.restore();
    fakeDate.restore();
    uuidv4.restore();
  });

  it('should return a new password token', async () => {
    await UsersHelper.createPasswordToken(email);
    sinon.assert.calledOnceWithExactly(updateOne, { 'local.email': email }, { $set: payload }, { new: true });
  });
});

describe('forgotPassword', () => {
  let UserMock;
  let forgotPasswordEmail;
  let fakeDate;
  let uuidv4;
  const token = '1234567890';
  const email = 'toto@toto.com';
  const date = new Date('2020-01-13');
  const payload = { passwordToken: { token, expiresIn: date.getTime() + 3600000 } };

  beforeEach(() => {
    UserMock = sinon.mock(User);
    forgotPasswordEmail = sinon.stub(EmailHelper, 'forgotPasswordEmail');
    fakeDate = sinon.useFakeTimers(date);
    uuidv4 = sinon.stub(uuid, 'v4').returns('1234567890');
  });
  afterEach(() => {
    UserMock.restore();
    forgotPasswordEmail.restore();
    fakeDate.restore();
    uuidv4.restore();
  });

  it('should throw an error if user does not exist', async () => {
    try {
      UserMock.expects('findOneAndUpdate')
        .withExactArgs({ 'local.email': email }, { $set: payload }, { new: true })
        .chain('lean')
        .withExactArgs()
        .once()
        .returns(null);

      await UsersHelper.forgotPassword(email);
    } catch (e) {
      expect(e).toEqual(Boom.notFound(translate[language].userNotFound));
    } finally {
      UserMock.verify();
      sinon.assert.notCalled(forgotPasswordEmail);
    }
  });

  it('should return a new access token after checking reset password token', async () => {
    const user = { _id: new ObjectID(), local: { email: 'toto@toto.com', ...payload } };

    UserMock.expects('findOneAndUpdate')
      .withExactArgs({ 'local.email': email }, { $set: payload }, { new: true })
      .chain('lean')
      .withExactArgs()
      .once()
      .returns(user);
    forgotPasswordEmail.returns({ sent: true });

    const result = await UsersHelper.forgotPassword(email);

    expect(result).toEqual({ sent: true });
    UserMock.verify();
    sinon.assert.calledWithExactly(forgotPasswordEmail, email, payload.passwordToken);
  });
});
