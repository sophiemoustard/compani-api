const { ObjectID } = require('mongodb');
const expect = require('expect');
const moment = require('moment');
const sinon = require('sinon');
const Boom = require('boom');
const flat = require('flat');
const cloneDeep = require('lodash/cloneDeep');
const UsersHelper = require('../../../src/helpers/users');
const RolesHelper = require('../../../src/helpers/roles');
const translate = require('../../../src/helpers/translate');
const GdriveStorageHelper = require('../../../src/helpers/gdriveStorage');
const User = require('../../../src/models/User');
const Contract = require('../../../src/models/Contract');
const Role = require('../../../src/models/Role');
const Task = require('../../../src/models/Task');

require('sinon-mongoose');

const { language } = translate;

describe('getUsersList', () => {
  let UserMock;
  let RoleMock;
  const users = [{ _id: new ObjectID() }, { _id: new ObjectID() }];
  const roles = [{ _id: new ObjectID() }, { _id: new ObjectID() }];
  const credentials = { company: { _id: new ObjectID() } };
  const companyId = credentials.company._id;

  beforeEach(() => {
    UserMock = sinon.mock(User);
    RoleMock = sinon.mock(Role);
  });

  afterEach(() => {
    UserMock.restore();
    RoleMock.restore();
  });

  it('should get users', async () => {
    const query = { email: 'toto@test.com' };

    UserMock
      .expects('find')
      .withExactArgs({ ...query, company: companyId }, {}, { autopopulate: false })
      .chain('populate')
      .withExactArgs({ path: 'procedure.task', select: 'name' })
      .chain('populate')
      .withExactArgs({ path: 'customers', select: 'identity driveFolder' })
      .chain('populate')
      .withExactArgs({ path: 'company', select: 'auxiliariesConfig' })
      .chain('populate')
      .withExactArgs({ path: 'role', select: 'name' })
      .chain('populate')
      .withExactArgs('contracts')
      .chain('populate')
      .withExactArgs('sector')
      .chain('lean')
      .withExactArgs({ virtuals: true })
      .returns(users);

    const result = await UsersHelper.getUsersList(query, credentials);
    expect(result).toEqual(users);
    UserMock.verify();
  });

  it('should get users according to multiple roles', async () => {
    const query = { role: ['auxiliary', 'planningReferent'] };

    RoleMock
      .expects('find')
      .withExactArgs({ name: { $in: query.role } }, { _id: 1 })
      .chain('lean')
      .returns(roles);

    UserMock
      .expects('find')
      .withExactArgs({ role: roles, company: companyId }, {}, { autopopulate: false })
      .chain('populate')
      .withExactArgs({ path: 'procedure.task', select: 'name' })
      .chain('populate')
      .withExactArgs({ path: 'customers', select: 'identity driveFolder' })
      .chain('populate')
      .withExactArgs({ path: 'company', select: 'auxiliariesConfig' })
      .chain('populate')
      .withExactArgs({ path: 'role', select: 'name' })
      .chain('populate')
      .withExactArgs('contracts')
      .chain('populate')
      .withExactArgs('sector')
      .chain('lean')
      .withExactArgs({ virtuals: true })
      .returns(users);

    const result = await UsersHelper.getUsersList(query, credentials);
    expect(result).toEqual(users);
    RoleMock.verify();
    UserMock.verify();
  });

  it('should get users according to a role', async () => {
    const query = { role: 'auxiliary' };

    RoleMock
      .expects('findOne')
      .withExactArgs({ name: query.role }, { _id: 1 })
      .chain('lean')
      .returns(roles[0]);

    UserMock
      .expects('find')
      .withExactArgs({ role: roles[0], company: companyId }, {}, { autopopulate: false })
      .chain('populate')
      .withExactArgs({ path: 'procedure.task', select: 'name' })
      .chain('populate')
      .withExactArgs({ path: 'customers', select: 'identity driveFolder' })
      .chain('populate')
      .withExactArgs({ path: 'company', select: 'auxiliariesConfig' })
      .chain('populate')
      .withExactArgs({ path: 'role', select: 'name' })
      .chain('populate')
      .withExactArgs('contracts')
      .chain('populate')
      .withExactArgs('sector')
      .chain('lean')
      .withExactArgs({ virtuals: true })
      .returns(users);

    const result = await UsersHelper.getUsersList(query, credentials);
    expect(result).toEqual(users);
    RoleMock.verify();
    UserMock.verify();
  });

  it('should return a 404 error if role in query does not exist', async () => {
    const query = { role: 'toto' };

    RoleMock
      .expects('findOne')
      .withExactArgs({ name: query.role }, { _id: 1 })
      .chain('lean')
      .returns(null);

    UserMock
      .expects('find')
      .never();

    try {
      await UsersHelper.getUsersList(query, credentials);
    } catch (e) {
      expect(e).toEqual(Boom.notFound(translate[language].roleNotFound));
    } finally {
      RoleMock.verify();
      UserMock.verify();
    }
  });
});

describe('getUser', () => {
  let userMock;
  let populateRole;
  beforeEach(() => {
    userMock = sinon.mock(User);
    populateRole = sinon.stub(RolesHelper, 'populateRole');
  });
  afterEach(() => {
    userMock.restore();
    populateRole.restore();
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
      .chain('lean')
      .withExactArgs({ autopopulate: true, virtuals: true })
      .once()
      .returns(user);

    await UsersHelper.getUser(userId);

    sinon.assert.notCalled(populateRole);
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
      .chain('lean')
      .withExactArgs({ autopopulate: true, virtuals: true })
      .once()
      .returns(user);
    populateRole.returns(user);

    await UsersHelper.getUser(userId);

    sinon.assert.calledWithExactly(populateRole, [{ _id: rightId }], { onlyGrantedRights: true });
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
        .chain('lean')
        .withExactArgs({ autopopulate: true, virtuals: true })
        .once()
        .returns(null);

      await UsersHelper.getUser(userId);
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
  let populateRoleStub;
  const userRights = [{
    right_id: { _id: new ObjectID().toHexString(), permission: 'test' },
    hasAccess: true,
  }, {
    right_id: { _id: new ObjectID().toHexString(), permission: 'test2' },
    hasAccess: false,
  }];
  const populatedUserRights = userRights.map(right => ({
    ...right,
    right_id: right.right_id._id,
    permission: right.right_id.permission,
  }));
  const credentials = { company: { _id: new ObjectID() } };

  beforeEach(() => {
    UserMock = sinon.mock(User);
    TaskMock = sinon.mock(Task);
    RoleMock = sinon.mock(Role);
    populateRoleStub = sinon.stub(RolesHelper, 'populateRole');
  });

  afterEach(() => {
    UserMock.restore();
    TaskMock.restore();
    RoleMock.restore();
    populateRoleStub.restore();
  });

  it('should create an auxiliary', async () => {
    const payload = {
      identity: { lastname: 'Test', firstname: 'Toto' },
      local: { email: 'toto@test.com', password: '1234567890' },
      role: new ObjectID(),
    };
    const newUser = {
      _id: new ObjectID(),
      ...payload,
      role: { name: 'auxiliary', rights: userRights },
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

    RoleMock
      .expects('findById')
      .withExactArgs(payload.role, { name: 1 })
      .chain('lean')
      .returns({ name: 'auxiliary' });

    TaskMock.expects('find').chain('lean').returns(tasks);

    UserMock.expects('create')
      .withExactArgs({
        ...payload,
        company: credentials.company._id,
        refreshToken: sinon.match.string,
        procedure: taskIds,
      })
      .returns({ ...newUserWithProcedure });

    populateRoleStub.returns(populatedUserRights);

    const result = await UsersHelper.createUser(payload, credentials);

    expect(result).toMatchObject({
      ...newUserWithProcedure,
      role: { name: newUser.role.name, rights: populatedUserRights },
    });
    RoleMock.verify();
    TaskMock.verify();
    UserMock.verify();
    sinon.assert.calledWithExactly(populateRoleStub, newUser.role.rights, { onlyGrantedRights: true });
  });

  it('should create a coach', async () => {
    const payload = {
      identity: { lastname: 'Test', firstname: 'Toto' },
      local: { email: 'toto@test.com', password: '1234567890' },
      role: new ObjectID(),
    };
    const newUser = {
      _id: new ObjectID(),
      ...payload,
      role: { name: 'coach', rights: userRights },
    };

    RoleMock
      .expects('findById')
      .withExactArgs(payload.role, { name: 1 })
      .chain('lean')
      .returns({ name: 'coach' });

    TaskMock.expects('find').never();

    UserMock.expects('create')
      .withExactArgs({
        ...payload,
        company: credentials.company._id,
        refreshToken: sinon.match.string,
      })
      .returns({ ...newUser });

    populateRoleStub.returns(populatedUserRights);

    const result = await UsersHelper.createUser(payload, credentials);

    expect(result).toMatchObject({
      ...newUser,
      role: { name: newUser.role.name, rights: populatedUserRights },
    });
    RoleMock.verify();
    TaskMock.verify();
    UserMock.verify();
    sinon.assert.calledWithExactly(populateRoleStub, newUser.role.rights, { onlyGrantedRights: true });
  });

  it('should create an admin', async () => {
    const payload = {
      identity: { lastname: 'Admin', firstname: 'Toto' },
      local: { email: 'admin@test.com', password: '1234567890' },
      role: new ObjectID(),
      company: new ObjectID(),
    };
    const newUser = {
      _id: new ObjectID(),
      ...payload,
      role: { name: 'admin', rights: userRights },
    };

    RoleMock
      .expects('findById')
      .withExactArgs(payload.role, { name: 1 })
      .chain('lean')
      .returns({ name: 'admin' });

    TaskMock.expects('find').never();

    UserMock.expects('create')
      .withExactArgs({
        ...payload,
        refreshToken: sinon.match.string,
      })
      .returns({ ...newUser });

    populateRoleStub.returns(populatedUserRights);

    const result = await UsersHelper.createUser(payload, credentials);

    expect(result).toMatchObject({
      ...newUser,
      role: { name: newUser.role.name, rights: populatedUserRights },
    });
    RoleMock.verify();
    TaskMock.verify();
    UserMock.verify();
    sinon.assert.calledWithExactly(populateRoleStub, newUser.role.rights, { onlyGrantedRights: true });
  });

  it('should return a 400 error if role does not exist', async () => {
    try {
      const payload = {
        identity: { lastname: 'Test', firstname: 'Toto' },
        local: { email: 'toto@test.com', password: '1234567890' },
        role: new ObjectID(),
      };

      RoleMock
        .expects('findById')
        .withExactArgs(payload.role, { name: 1 })
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
      sinon.assert.notCalled(populateRoleStub);
    }
  });
});

describe('updateUser', () => {
  let UserMock;
  let populateRoleStub;
  const userId = new ObjectID();
  const user = {
    _id: userId,
    role: {
      rights: [{
        right_id: { _id: new ObjectID().toHexString(), permission: 'test' },
        hasAccess: true,
      }, {
        right_id: { _id: new ObjectID().toHexString(), permission: 'test2' },
        hasAccess: false,
      }],
    },
  };
  const populatedUserRights = user.role.rights.map(right => ({
    ...right,
    right_id: right.right_id._id,
    permission: right.right_id.permission,
  }));

  beforeEach(() => {
    UserMock = sinon.mock(User);
    populateRoleStub = sinon.stub(RolesHelper, 'populateRole');
  });

  afterEach(() => {
    UserMock.restore();
    populateRoleStub.restore();
  });

  it('should update a user and populate role', async () => {
    const payload = { identity: { firstname: 'Titi' } };

    UserMock
      .expects('findOneAndUpdate')
      .withExactArgs({ _id: userId }, { $set: flat(payload) }, { new: true, runValidators: true })
      .chain('lean')
      .withExactArgs({ autopopulate: true })
      .returns({ ...cloneDeep(user), payload });

    populateRoleStub.returns(populatedUserRights);

    const result = await UsersHelper.updateUser(userId, payload);

    expect(result).toMatchObject({
      ...user,
      payload,
      role: { rights: populatedUserRights },
    });
    UserMock.verify();
    sinon.assert.calledWithExactly(populateRoleStub, user.role.rights, { onlyGrantedRights: true });
  });

  it('should update a user and not populate role', async () => {
    const payload = { identity: { firstname: 'Titi' } };

    UserMock
      .expects('findOneAndUpdate')
      .withExactArgs({ _id: userId }, { $set: flat(payload) }, { new: true, runValidators: true })
      .chain('lean')
      .withExactArgs({ autopopulate: true })
      .returns({ _id: user._id, role: { rights: [] }, payload });

    populateRoleStub.returns(populatedUserRights);

    const result = await UsersHelper.updateUser(userId, payload);

    expect(result).toMatchObject({
      ...user,
      payload,
      role: { rights: [] },
    });
    UserMock.verify();
    sinon.assert.notCalled(populateRoleStub);
  });

  it('should update a user certificate and populate role', async () => {
    const payload = { 'administrative.certificates': { driveId: '1234567890' } };

    UserMock
      .expects('findOneAndUpdate')
      .withExactArgs({ _id: userId }, { $pull: payload }, { new: true })
      .chain('lean')
      .withExactArgs({ autopopulate: true })
      .returns({ ...cloneDeep(user), payload });

    populateRoleStub.returns(populatedUserRights);

    const result = await UsersHelper.updateUser(userId, payload);

    expect(result).toMatchObject({
      ...user,
      payload,
      role: { rights: populatedUserRights },
    });
    UserMock.verify();
    sinon.assert.calledWithExactly(populateRoleStub, user.role.rights, { onlyGrantedRights: true });
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
