const mongoose = require('mongoose');
const { ObjectID } = require('mongodb');
const expect = require('expect');
const moment = require('moment');
const { fn: momentProto } = require('moment');
const sinon = require('sinon');
const Boom = require('@hapi/boom');
const flat = require('flat');
const bcrypt = require('bcrypt');
const omit = require('lodash/omit');
const UsersHelper = require('../../../src/helpers/users');
const SectorHistoriesHelper = require('../../../src/helpers/sectorHistories');
const AuthenticationHelper = require('../../../src/helpers/authentication');
const EmailHelper = require('../../../src/helpers/email');
const translate = require('../../../src/helpers/translate');
const { TOKEN_EXPIRE_TIME } = require('../../../src/models/User');
const GdriveStorageHelper = require('../../../src/helpers/gdriveStorage');
const GCloudStorageHelper = require('../../../src/helpers/gCloudStorage');
const User = require('../../../src/models/User');
const Contract = require('../../../src/models/Contract');
const Role = require('../../../src/models/Role');
const { HELPER, AUXILIARY_WITHOUT_COMPANY, WEBAPP, MOBILE } = require('../../../src/helpers/constants');
const Company = require('../../../src/models/Company');

require('sinon-mongoose');

const { language } = translate;

describe('authenticate', () => {
  let UserMock;
  let compare;
  let encode;
  let momentToDate;
  beforeEach(() => {
    UserMock = sinon.mock(User);
    compare = sinon.stub(bcrypt, 'compare');
    encode = sinon.stub(AuthenticationHelper, 'encode');
    momentToDate = sinon.stub(momentProto, 'toDate');
  });
  afterEach(() => {
    UserMock.restore();
    compare.restore();
    encode.restore();
    momentToDate.restore();
  });

  it('should authenticate user and set firstMobileConnection', async () => {
    const payload = { email: 'toto@email.com', password: 'toto', origin: 'mobile' };
    const user = {
      _id: new ObjectID(),
      refreshToken: 'token',
      local: { password: 'toto' },
    };
    momentToDate.returns('2020-12-08T13:45:25.437Z');

    UserMock.expects('findOne')
      .withExactArgs({ 'local.email': payload.email.toLowerCase() })
      .chain('select')
      .withExactArgs('local refreshToken')
      .chain('lean')
      .once()
      .returns(user);
    compare.returns(true);
    encode.returns('token');
    UserMock.expects('updateOne')
      .withExactArgs(
        { _id: user._id, firstMobileConnection: { $exists: false } },
        { $set: { firstMobileConnection: '2020-12-08T13:45:25.437Z' } }
      );

    const result = await UsersHelper.authenticate(payload);

    expect(result).toEqual({ token: 'token', refreshToken: user.refreshToken, user: { _id: user._id.toHexString() } });
    UserMock.verify();
    sinon.assert.calledOnceWithExactly(compare, payload.password, 'toto');
    sinon.assert.calledOnceWithExactly(
      encode,
      { _id: user._id.toHexString() },
      TOKEN_EXPIRE_TIME
    );
  });

  it('should authenticate user but not set firstMobileConnection (authentication from webapp)', async () => {
    const payload = { email: 'toto@email.com', password: 'toto', origin: 'webapp' };
    const user = {
      _id: new ObjectID(),
      refreshToken: 'token',
      local: { password: 'toto' },
    };
    UserMock.expects('findOne')
      .withExactArgs({ 'local.email': payload.email.toLowerCase() })
      .chain('select')
      .withExactArgs('local refreshToken')
      .chain('lean')
      .once()
      .returns(user);
    compare.returns(true);
    encode.returns('token');
    UserMock.expects('updateOne').never();

    const result = await UsersHelper.authenticate(payload);

    expect(result).toEqual({ token: 'token', refreshToken: user.refreshToken, user: { _id: user._id.toHexString() } });
    UserMock.verify();
    sinon.assert.calledOnceWithExactly(compare, payload.password, 'toto');
    sinon.assert.calledOnceWithExactly(
      encode,
      { _id: user._id.toHexString() },
      TOKEN_EXPIRE_TIME
    );
  });

  it('should authenticate user but not set firstMobileConnection (firstMobileConnection already set)', async () => {
    const payload = { email: 'toto@email.com', password: 'toto', origin: 'mobile' };
    const user = {
      _id: new ObjectID(),
      refreshToken: 'token',
      local: { password: 'toto' },
      firstMobileConnection: '2020-12-08T13:45:25.437Z',
    };
    momentToDate.returns('2020-12-08T13:45:25.437Z');

    UserMock.expects('findOne')
      .withExactArgs({ 'local.email': payload.email.toLowerCase() })
      .chain('select')
      .withExactArgs('local refreshToken')
      .chain('lean')
      .once()
      .returns(user);
    compare.returns(true);
    encode.returns('token');
    UserMock.expects('updateOne').never();

    const result = await UsersHelper.authenticate(payload);

    expect(result).toEqual({ token: 'token', refreshToken: user.refreshToken, user: { _id: user._id.toHexString() } });
    UserMock.verify();
    sinon.assert.calledOnceWithExactly(compare, payload.password, 'toto');
    sinon.assert.calledOnceWithExactly(
      encode,
      { _id: user._id.toHexString() },
      TOKEN_EXPIRE_TIME
    );
  });

  it('should throw an error if user does not exist', async () => {
    try {
      const payload = { email: 'toto@email.com', password: '123456!eR' };
      UserMock.expects('findOne')
        .withExactArgs({ 'local.email': payload.email.toLowerCase() })
        .chain('select')
        .withExactArgs('local refreshToken')
        .chain('lean')
        .once()
        .returns(null);

      UserMock.expects('updateOne').never();

      await UsersHelper.authenticate(payload);
    } catch (e) {
      expect(e.output.statusCode).toEqual(401);
    } finally {
      UserMock.verify();
      sinon.assert.calledOnceWithExactly(compare, '123456!eR', '');
      sinon.assert.notCalled(encode);
    }
  });

  it('should throw an error if refresh token does not exist', async () => {
    try {
      const payload = { email: 'toto@email.com', password: '123456!eR' };
      UserMock.expects('findOne')
        .withExactArgs({ 'local.email': payload.email.toLowerCase() })
        .chain('select')
        .withExactArgs('local refreshToken')
        .chain('lean')
        .once()
        .returns({ _id: new ObjectID() });

      UserMock.expects('updateOne').never();

      await UsersHelper.authenticate(payload);
    } catch (e) {
      expect(e.output.statusCode).toEqual(401);
    } finally {
      UserMock.verify();
      sinon.assert.calledOnceWithExactly(compare, '123456!eR', '');
      sinon.assert.notCalled(encode);
    }
  });

  it('should throw an error if wrong password', async () => {
    const payload = { email: 'toto@email.com', password: '123456!eR' };
    try {
      UserMock.expects('findOne')
        .withExactArgs({ 'local.email': payload.email.toLowerCase() })
        .chain('select')
        .withExactArgs('local refreshToken')
        .chain('lean')
        .once()
        .returns({ _id: new ObjectID(), refreshToken: 'token', local: { password: 'password_hash' } });
      compare.returns(false);
      UserMock.expects('updateOne').never();

      await UsersHelper.authenticate(payload);
    } catch (e) {
      expect(e.output.statusCode).toEqual(401);
    } finally {
      UserMock.verify();
      sinon.assert.calledOnceWithExactly(compare, payload.password, 'password_hash');
      sinon.assert.notCalled(encode);
    }
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
      .once()
      .returns(user);
    encode.returns('token');

    const result = await UsersHelper.refreshToken(payload);

    expect(result).toEqual({ token: 'token', refreshToken: 'token', user: { _id: user._id.toHexString() } });
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

    UserMock.expects('find')
      .withExactArgs({ ...query, company: companyId }, {}, { autopopulate: false })
      .chain('populate')
      .withExactArgs({ path: 'customers', select: 'identity driveFolder' })
      .chain('populate')
      .withExactArgs({ path: 'role.client', select: '-__v -createdAt -updatedAt' })
      .chain('populate')
      .withExactArgs({
        path: 'sector',
        select: '_id sector',
        match: { company: credentials.company._id },
        options: { isVendorUser: false },
      })
      .chain('populate')
      .withExactArgs({ path: 'contracts', select: 'startDate endDate' })
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

    UserMock.expects('find')
      .withExactArgs(formattedQuery, {}, { autopopulate: false })
      .chain('populate')
      .withExactArgs({ path: 'customers', select: 'identity driveFolder' })
      .chain('populate')
      .withExactArgs({ path: 'role.client', select: '-__v -createdAt -updatedAt' })
      .chain('populate')
      .withExactArgs({
        path: 'sector',
        select: '_id sector',
        match: { company: credentials.company._id },
        options: { isVendorUser: false },
      })
      .chain('populate')
      .withExactArgs({ path: 'contracts', select: 'startDate endDate' })
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

    UserMock.expects('find')
      .withExactArgs(formattedQuery, {}, { autopopulate: false })
      .chain('populate')
      .withExactArgs({ path: 'role.client', select: '-__v -createdAt -updatedAt' })
      .chain('populate')
      .withExactArgs({
        path: 'sectorHistories',
        select: '_id sector startDate endDate',
        match: { company: credentials.company._id },
        options: { isVendorUser: false },
      })
      .chain('populate')
      .withExactArgs({ path: 'contracts', select: 'startDate endDate' })
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
    sinon.assert.calledWithExactly(
      formatQueryForUsersListStub,
      { ...query, role: ['auxiliary', 'planning_referent', 'auxiliary_without_company'] }
    );
    UserMock.verify();
  });
});

describe('getLearnerList', () => {
  let UserMock;
  let findRole;
  beforeEach(() => {
    UserMock = sinon.mock(User);
    findRole = sinon.stub(Role, 'find');
  });
  afterEach(() => {
    UserMock.restore();
    findRole.restore();
  });

  it('should get all learners', async () => {
    const query = {};
    const credentials = { role: { vendor: new ObjectID() } };
    const users = [{ _id: new ObjectID() }, { _id: new ObjectID() }];
    UserMock.expects('find')
      .withExactArgs({}, 'identity.firstname identity.lastname picture', { autopopulate: false })
      .chain('populate')
      .withExactArgs({ path: 'company', select: 'name' })
      .chain('populate')
      .withExactArgs({ path: 'blendedCoursesCount' })
      .chain('populate')
      .withExactArgs({ path: 'eLearningCoursesCount' })
      .chain('setOptions')
      .withExactArgs({ isVendorUser: true })
      .chain('lean')
      .returns(users);

    const result = await UsersHelper.getLearnerList(query, credentials);

    expect(result).toEqual(users);
    sinon.assert.notCalled(findRole);
    UserMock.verify();
  });

  it('should get learners from company', async () => {
    const query = { company: new ObjectID() };
    const credentials = { role: { client: new ObjectID() } };
    const roleId1 = new ObjectID();
    const roleId2 = new ObjectID();
    const rolesToExclude = [{ _id: roleId1 }, { _id: roleId2 }];
    const users = [{ _id: new ObjectID() }, { _id: new ObjectID() }];
    findRole.returns(rolesToExclude);
    UserMock.expects('find')
      .withExactArgs(
        { company: query.company, 'role.client': { $not: { $in: [roleId1, roleId2] } } },
        'identity.firstname identity.lastname picture',
        { autopopulate: false }
      )
      .chain('populate')
      .withExactArgs({ path: 'company', select: 'name' })
      .chain('populate')
      .withExactArgs({ path: 'blendedCoursesCount' })
      .chain('populate')
      .withExactArgs({ path: 'eLearningCoursesCount' })
      .chain('setOptions')
      .withExactArgs({ isVendorUser: false })
      .chain('lean')
      .returns(users);

    const result = await UsersHelper.getLearnerList(query, credentials);

    expect(result).toEqual(users);
    sinon.assert.calledOnceWithExactly(findRole, { name: { $in: [HELPER, AUXILIARY_WITHOUT_COMPANY] } });
    UserMock.verify();
  });
});

describe('getUser', () => {
  let userMock;
  beforeEach(() => {
    userMock = sinon.mock(User);
  });
  afterEach(() => {
    userMock.restore();
  });

  it('should return user without populating role', async () => {
    const userId = new ObjectID();
    const user = { _id: userId, role: { name: 'helper', rights: [] } };
    const credentials = { company: { _id: new ObjectID() }, _id: new ObjectID() };
    userMock.expects('findOne')
      .withExactArgs({ _id: userId })
      .chain('populate')
      .withExactArgs({
        path: 'contracts',
        select: '-__v -createdAt -updatedAt',
      })
      .chain('populate')
      .withExactArgs({
        path: 'sector',
        select: '_id sector',
        match: { company: credentials.company._id },
        options: { isVendorUser: false, requestingOwnInfos: false },
      })
      .chain('lean')
      .withExactArgs({ autopopulate: true, virtuals: true })
      .once()
      .returns(user);

    await UsersHelper.getUser(userId, credentials);

    userMock.verify();
  });

  it('should return user populating role because isVendorUser', async () => {
    const userId = new ObjectID();
    const user = { _id: userId, role: { vendor: 'trainer', rights: [] } };
    const credentials = { company: { _id: new ObjectID() }, _id: new ObjectID(), role: { vendor: 'trainer' } };
    userMock.expects('findOne')
      .withExactArgs({ _id: userId })
      .chain('populate')
      .withExactArgs({
        path: 'contracts',
        select: '-__v -createdAt -updatedAt',
      })
      .chain('populate')
      .withExactArgs({
        path: 'sector',
        select: '_id sector',
        match: { company: credentials.company._id },
        options: { isVendorUser: true, requestingOwnInfos: false },
      })
      .chain('lean')
      .withExactArgs({ autopopulate: true, virtuals: true })
      .once()
      .returns(user);

    await UsersHelper.getUser(userId, credentials);

    userMock.verify();
  });

  it('should return user populating role because requestingOwnInfos', async () => {
    const userId = new ObjectID();
    const user = { _id: userId, role: { vendor: 'trainer', rights: [] } };
    const credentials = { company: { _id: new ObjectID() }, _id: userId };
    userMock.expects('findOne')
      .withExactArgs({ _id: userId })
      .chain('populate')
      .withExactArgs({
        path: 'contracts',
        select: '-__v -createdAt -updatedAt',
      })
      .chain('populate')
      .withExactArgs({
        path: 'sector',
        select: '_id sector',
        match: { company: credentials.company._id },
        options: { isVendorUser: false, requestingOwnInfos: true },
      })
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
      const credentials = {
        company: { _id: new ObjectID() },
        role: { vendor: { _id: new ObjectID() } },
        _id: new ObjectID(),
      };

      userMock.expects('findOne')
        .withExactArgs({ _id: userId })
        .chain('populate')
        .withExactArgs({
          path: 'contracts',
          select: '-__v -createdAt -updatedAt',
        })
        .chain('populate')
        .withExactArgs({
          path: 'sector',
          select: '_id sector',
          match: { company: credentials.company._id },
          options: { isVendorUser: true, requestingOwnInfos: false },
        })
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

describe('userExists', () => {
  let userMock;
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
    userMock = sinon.mock(User);
  });
  afterEach(() => {
    userMock.restore();
  });

  it('should find a user if credentials', async () => {
    userMock.expects('findOne')
      .withExactArgs({ 'local.email': email }, { company: 1, role: 1 })
      .chain('lean').returns(user);

    const rep = await UsersHelper.userExists(email, vendorCredentials);

    expect(rep.exists).toBe(true);
    expect(rep.user).toEqual(omit(user, 'local'));
  });

  it('should not find as email does not exist', async () => {
    userMock.expects('findOne')
      .withExactArgs({ 'local.email': nonExistantEmail }, { company: 1, role: 1 })
      .chain('lean').returns(null);

    const rep = await UsersHelper.userExists(nonExistantEmail, vendorCredentials);

    expect(rep.exists).toBe(false);
    expect(rep.user).toEqual({});
  });

  it('should only confirm targeted user exist, as logged user has only client role', async () => {
    userMock.expects('findOne')
      .withExactArgs({ 'local.email': email }, { company: 1, role: 1 })
      .chain('lean').returns(user);

    const rep = await UsersHelper.userExists(email, clientCredentials);

    expect(rep.exists).toBe(true);
    expect(rep.user).toEqual({});
  });

  it('should find targeted user and give all infos, as targeted user has no company', async () => {
    userMock.expects('findOne')
      .withExactArgs({ 'local.email': email }, { company: 1, role: 1 })
      .chain('lean').returns(userWithoutCompany);

    const rep = await UsersHelper.userExists(email, clientCredentials);

    expect(rep.exists).toBe(true);
    expect(rep.user).toEqual(omit(userWithoutCompany, 'local'));
  });

  it('should find an email but no user if no credentials', async () => {
    userMock.expects('findOne')
      .withExactArgs({ 'local.email': email }, { company: 1, role: 1 })
      .chain('lean').returns(user);

    const rep = await UsersHelper.userExists(email);

    expect(rep.exists).toBe(true);
    expect(rep.user).toEqual({});
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
  let RoleMock;
  let objectIdStub;
  let createHistoryStub;
  let momentToDate;
  const userId = new ObjectID();
  const roleId = new ObjectID();

  beforeEach(() => {
    UserMock = sinon.mock(User);
    RoleMock = sinon.mock(Role);
    objectIdStub = sinon.stub(mongoose.Types, 'ObjectId').returns(userId);
    createHistoryStub = sinon.stub(SectorHistoriesHelper, 'createHistory');
    momentToDate = sinon.stub(momentProto, 'toDate');
  });

  afterEach(() => {
    UserMock.restore();
    RoleMock.restore();
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

    RoleMock.expects('findById').never();
    UserMock.expects('findOne').never();
    UserMock.expects('create')
      .withExactArgs({ ...payload, refreshToken: sinon.match.string })
      .once()
      .returns({ identity: payload.identity, local: payload.local, contact: payload.contact });

    const result = await UsersHelper.createUser(payload, null);

    expect(result).toEqual({ identity: payload.identity, local: payload.local, contact: payload.contact });
    RoleMock.verify();
    UserMock.verify();
    sinon.assert.notCalled(createHistoryStub);
  });

  it('should set firstMobileConnection if origin is mobile', async () => {
    const payload = {
      identity: { lastname: 'Test', firstname: 'Toto' },
      local: { email: 'toto@test.com' },
      contact: { phone: '0606060606' },
      origin: MOBILE,
    };
    const date = '2020-12-08T13:45:25.437Z';

    momentToDate.returns(date);
    RoleMock.expects('findById').never();
    UserMock.expects('findOne').never();
    UserMock.expects('create')
      .withExactArgs({ ...payload, refreshToken: sinon.match.string, firstMobileConnection: date, origin: MOBILE })
      .once()
      .returns(payload);

    const result = await UsersHelper.createUser(payload, null);

    expect(result).toEqual(payload);
    RoleMock.verify();
    UserMock.verify();
    sinon.assert.calledOnceWithExactly(momentToDate);
    sinon.assert.notCalled(createHistoryStub);
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

    RoleMock.expects('findById')
      .withExactArgs(payload.role, { name: 1, interface: 1 })
      .chain('lean')
      .returns({ _id: roleId, name: 'auxiliary', interface: 'client' });
    UserMock.expects('create')
      .withExactArgs({
        identity: { lastname: 'Test' },
        local: { email: 'toto@test.com' },
        origin: WEBAPP,
        company: companyId,
        refreshToken: sinon.match.string,
        role: { client: roleId },
      })
      .returns(newUser);
    UserMock.expects('findOne')
      .withExactArgs({ _id: userId })
      .chain('populate')
      .withExactArgs({ path: 'sector', select: '_id sector', match: { company: companyId } })
      .chain('lean')
      .withExactArgs({ virtuals: true, autopopulate: true })
      .returns(newUser);
    UserMock.expects('findOneAndUpdate').never();

    const result = await UsersHelper.createUser(payload, { company: { _id: companyId } });

    expect(result).toEqual(newUser);
    RoleMock.verify();
    UserMock.verify();
    sinon.assert.calledWithExactly(createHistoryStub, { _id: userId, sector: payload.sector }, companyId);
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

    RoleMock.expects('findById')
      .withExactArgs(payload.role, { name: 1, interface: 1 })
      .chain('lean')
      .returns({ _id: roleId, name: 'coach', interface: 'client' });
    UserMock.expects('create')
      .withExactArgs({ ...payload, company: companyId, refreshToken: sinon.match.string })
      .returns(newUser);
    UserMock.expects('findOne')
      .withExactArgs({ _id: userId })
      .chain('populate')
      .withExactArgs({ path: 'sector', select: '_id sector', match: { company: companyId } })
      .chain('lean')
      .withExactArgs({ virtuals: true, autopopulate: true })
      .returns(newUser);

    const result = await UsersHelper.createUser(payload, { company: { _id: companyId } });

    expect(result).toEqual(newUser);
    RoleMock.verify();
    UserMock.verify();
    sinon.assert.notCalled(createHistoryStub);
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

    RoleMock.expects('findById')
      .withExactArgs(payload.role, { name: 1, interface: 1 })
      .chain('lean')
      .returns({ _id: roleId, name: 'client_admin', interface: 'client' });
    UserMock.expects('create')
      .withExactArgs({ ...payload, role: { client: roleId }, refreshToken: sinon.match.string })
      .returns(newUser);
    UserMock.expects('findOne')
      .withExactArgs({ _id: userId })
      .chain('populate')
      .withExactArgs({ path: 'sector', select: '_id sector', match: { company: payload.company } })
      .chain('lean')
      .withExactArgs({ virtuals: true, autopopulate: true })
      .returns(newUser);

    const result = await UsersHelper.createUser(payload, { company: { _id: companyId } });

    expect(result).toEqual(newUser);
    RoleMock.verify();
    UserMock.verify();
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

    RoleMock.expects('findById')
      .withExactArgs(payload.role, { name: 1, interface: 1 })
      .chain('lean')
      .returns({ _id: roleId, name: 'trainer', interface: 'vendor' });
    UserMock.expects('create')
      .withExactArgs({ ...payload, role: { vendor: roleId }, refreshToken: sinon.match.string })
      .returns(newUser);
    UserMock.expects('findOne')
      .withExactArgs({ _id: userId })
      .chain('populate')
      .withExactArgs({ path: 'sector', select: '_id sector', match: { company: companyId } })
      .chain('lean')
      .withExactArgs({ virtuals: true, autopopulate: true })
      .returns(newUser);

    const result = await UsersHelper.createUser(payload, { company: { _id: companyId } });

    expect(result).toEqual(newUser);
    RoleMock.verify();
    UserMock.verify();
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

    RoleMock.expects('findById').never();
    UserMock.expects('findOne').never();
    UserMock.expects('create')
      .withExactArgs({ ...payload, refreshToken: sinon.match.string })
      .returns(newUser);

    const result = await UsersHelper.createUser(payload, { company: { _id: companyId } });
    expect(result).toEqual(newUser);

    RoleMock.verify();
    UserMock.verify();
    sinon.assert.notCalled(createHistoryStub);
  });

  it('should return a 400 error if role does not exist', async () => {
    try {
      const companyId = new ObjectID();
      const payload = {
        identity: { lastname: 'Test', firstname: 'Toto' },
        local: { email: 'toto@test.com' },
        role: roleId,
        origin: WEBAPP,
      };

      RoleMock.expects('findById')
        .withExactArgs(payload.role, { name: 1, interface: 1 })
        .chain('lean')
        .returns(null);
      UserMock.expects('create').never();

      await UsersHelper.createUser(payload, { company: { _id: companyId } });
    } catch (e) {
      expect(e).toEqual(Boom.badRequest('Le rôle n\'existe pas'));
    } finally {
      RoleMock.verify();
      UserMock.verify();
      sinon.assert.notCalled(createHistoryStub);
    }
  });
});

describe('removeHelper', () => {
  let UserMock;
  let RoleMock;

  const user = { _id: new ObjectID() };
  const roleId = new ObjectID();

  beforeEach(() => {
    UserMock = sinon.mock(User);
    RoleMock = sinon.mock(Role);
  });
  afterEach(() => {
    UserMock.restore();
    RoleMock.restore();
  });

  it('should remove client role and customers', async () => {
    RoleMock.expects('findOne').withExactArgs({ name: 'trainer' }).chain('lean').returns({ _id: roleId });

    UserMock.expects('findOneAndUpdate')
      .withExactArgs({ _id: user._id }, { $set: { customers: [] }, $unset: { 'role.client': '' } })
      .returns();

    await UsersHelper.removeHelper({ ...user, role: { vendor: new ObjectID() } });

    UserMock.verify();
    RoleMock.verify();
  });

  it('should remove client role and customers and company if user is trainer', async () => {
    RoleMock.expects('findOne').withExactArgs({ name: 'trainer' }).chain('lean').returns({ _id: roleId });

    UserMock.expects('findOneAndUpdate')
      .withExactArgs({ _id: user._id }, { $set: { customers: [] }, $unset: { 'role.client': '', company: '' } })
      .returns();

    await UsersHelper.removeHelper({ ...user, role: { vendor: roleId } });

    UserMock.verify();
    RoleMock.verify();
  });
});

describe('updateUser', () => {
  let UserMock;
  let RoleMock;
  let updateHistoryOnSectorUpdateStub;
  const credentials = { company: { _id: new ObjectID() } };
  const userId = new ObjectID();

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

    UserMock.expects('updateOne')
      .withExactArgs({ _id: userId, company: credentials.company._id }, { $set: flat(payload) })
      .returns();

    RoleMock.expects('findById').never();

    await UsersHelper.updateUser(userId, payload, credentials);

    UserMock.verify();
    RoleMock.verify();
    sinon.assert.notCalled(updateHistoryOnSectorUpdateStub);
  });

  it('should update a user without company', async () => {
    const payload = { identity: { firstname: 'Titi' } };

    UserMock.expects('updateOne')
      .withExactArgs({ _id: userId }, { $set: flat(payload) })
      .returns();

    RoleMock.expects('findById').never();

    await UsersHelper.updateUser(userId, payload, credentials, true);

    UserMock.verify();
    RoleMock.verify();
    sinon.assert.notCalled(updateHistoryOnSectorUpdateStub);
  });

  it('should update a user and create sector history', async () => {
    const payload = { identity: { firstname: 'Titi' }, sector: new ObjectID() };

    UserMock.expects('updateOne')
      .withExactArgs({ _id: userId, company: credentials.company._id }, { $set: flat(payload) })
      .returns();

    RoleMock.expects('findById').never();

    await UsersHelper.updateUser(userId, payload, credentials);

    UserMock.verify();
    RoleMock.verify();
    sinon.assert.calledWithExactly(updateHistoryOnSectorUpdateStub, userId, payload.sector, credentials.company._id);
  });

  it('should update a user role', async () => {
    const payload = { role: new ObjectID() };
    const payloadWithRole = { 'role.client': payload.role.toHexString() };

    UserMock
      .expects('updateOne')
      .withExactArgs({ _id: userId, company: credentials.company._id }, { $set: payloadWithRole })
      .returns();

    RoleMock
      .expects('findById')
      .withExactArgs(payload.role, { name: 1, interface: 1 })
      .chain('lean')
      .returns({ _id: payload.role, name: 'test', interface: 'client' });

    await UsersHelper.updateUser(userId, payload, credentials);

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
      expect(e).toEqual(Boom.badRequest('Le rôle n\'existe pas'));
    } finally {
      RoleMock.verify();
      sinon.assert.notCalled(updateHistoryOnSectorUpdateStub);
    }
  });
});

describe('updatePassword', () => {
  let UserMock;
  const userId = new ObjectID();
  const user = { _id: userId };

  beforeEach(() => {
    UserMock = sinon.mock(User);
  });
  afterEach(() => {
    UserMock.restore();
  });

  it('should update a user password', async () => {
    const payload = { local: { password: '123456!eR' } };

    UserMock.expects('findOneAndUpdate')
      .withExactArgs(
        { _id: userId },
        { $set: flat(payload), $unset: { passwordToken: '' } },
        { new: true }
      )
      .chain('lean')
      .returns({ ...user, ...payload });

    const result = await UsersHelper.updatePassword(userId, payload);

    expect(result).toEqual({ ...user, ...payload });
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
        .chain('select')
        .withExactArgs('local')
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
      .chain('select')
      .withExactArgs('local')
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
  let generatePasswordTokenStub;
  const email = 'toto@toto.com';

  beforeEach(() => {
    generatePasswordTokenStub = sinon.stub(UsersHelper, 'generatePasswordToken');
  });
  afterEach(() => {
    generatePasswordTokenStub.restore();
  });

  it('should return a new password token', async () => {
    generatePasswordTokenStub.returns({ token: '123456789' });
    const passwordToken = await UsersHelper.createPasswordToken(email);
    sinon.assert.calledOnceWithExactly(generatePasswordTokenStub, email, 24 * 3600 * 1000);
    expect(passwordToken).toEqual({ token: '123456789' });
  });
});

describe('forgotPassword', () => {
  let forgotPasswordEmail;
  let generatePasswordTokenStub;
  const email = 'toto@toto.com';

  beforeEach(() => {
    forgotPasswordEmail = sinon.stub(EmailHelper, 'forgotPasswordEmail');
    generatePasswordTokenStub = sinon.stub(UsersHelper, 'generatePasswordToken');
  });
  afterEach(() => {
    forgotPasswordEmail.restore();
    generatePasswordTokenStub.restore();
  });

  it('should return a new access token after checking reset password token', async () => {
    generatePasswordTokenStub.returns({ token: '123456789' });
    forgotPasswordEmail.returns({ sent: true });

    const result = await UsersHelper.forgotPassword(email);

    expect(result).toEqual({ sent: true });
    sinon.assert.calledOnceWithExactly(generatePasswordTokenStub, email, 3600000);
    sinon.assert.calledWithExactly(forgotPasswordEmail, email, { token: '123456789' });
  });
});

describe('generatePasswordToken', () => {
  let UserMock;
  let fakeDate;
  const email = 'toto@toto.com';
  const date = new Date('2020-01-13');
  const payload = { passwordToken: { token: expect.any(String), expiresIn: date.getTime() + 3600000 } };

  beforeEach(() => {
    UserMock = sinon.mock(User);
    fakeDate = sinon.useFakeTimers(date);
  });
  afterEach(() => {
    UserMock.restore();
    fakeDate.restore();
  });

  it('should throw an error if user does not exist', async () => {
    try {
      UserMock.expects('findOneAndUpdate')
        .chain('lean')
        .withExactArgs()
        .once()
        .returns(null);

      await UsersHelper.generatePasswordToken(email, 3600000);
    } catch (e) {
      expect(e).toEqual(Boom.notFound(translate[language].userNotFound));
    } finally {
      UserMock.verify();
    }
  });

  it('should return a new access token after checking reset password token', async () => {
    const user = { _id: new ObjectID(), local: { email: 'toto@toto.com', ...payload } };

    UserMock.expects('findOneAndUpdate')
      .chain('lean')
      .withExactArgs()
      .once()
      .returns(user);

    const result = await UsersHelper.generatePasswordToken(email, 3600000);

    expect(result).toEqual(payload.passwordToken);
    UserMock.verify();
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
  let CompanyMock;
  let createFolder;
  let updateOne;
  beforeEach(() => {
    CompanyMock = sinon.mock(Company);
    createFolder = sinon.stub(GdriveStorageHelper, 'createFolder');
    updateOne = sinon.stub(User, 'updateOne');
  });
  afterEach(() => {
    CompanyMock.restore();
    createFolder.restore();
    updateOne.restore();
  });

  it('should create a google drive folder and update user', async () => {
    const user = { _id: new ObjectID(), company: new ObjectID(), identity: { lastname: 'Delenda' } };

    CompanyMock.expects('findOne')
      .withExactArgs({ _id: user.company }, { auxiliariesFolderId: 1 })
      .chain('lean')
      .once()
      .returns({ auxiliariesFolderId: 'auxiliariesFolderId' });

    createFolder.returns({ webViewLink: 'webViewLink', id: 'folderId' });

    await UsersHelper.createDriveFolder(user);

    CompanyMock.verify();
    sinon.assert.calledOnceWithExactly(createFolder, { lastname: 'Delenda' }, 'auxiliariesFolderId');
    sinon.assert.calledOnceWithExactly(
      updateOne,
      { _id: user._id },
      { $set: { 'administrative.driveFolder.link': 'webViewLink', 'administrative.driveFolder.driveId': 'folderId' } }
    );
  });

  it('should return a 422 if user has no company', async () => {
    try {
      const user = { _id: new ObjectID(), company: new ObjectID() };

      CompanyMock.expects('findOne')
        .withExactArgs({ _id: user.company }, { auxiliariesFolderId: 1 })
        .chain('lean')
        .once()
        .returns(null);

      await UsersHelper.createDriveFolder(user);
    } catch (e) {
      expect(e.output.statusCode).toEqual(422);
    } finally {
      CompanyMock.verify();
      sinon.assert.notCalled(createFolder);
      sinon.assert.notCalled(updateOne);
    }
  });

  it('should return a 422 if user company has no auxialiaries folder Id', async () => {
    try {
      const user = { _id: new ObjectID(), company: new ObjectID() };

      CompanyMock.expects('findOne')
        .withExactArgs({ _id: user.company }, { auxiliariesFolderId: 1 })
        .chain('lean')
        .once()
        .returns({ _id: user.company });

      await UsersHelper.createDriveFolder(user);
    } catch (e) {
      expect(e.output.statusCode).toEqual(422);
    } finally {
      CompanyMock.verify();
      sinon.assert.notCalled(createFolder);
      sinon.assert.notCalled(updateOne);
    }
  });
});
