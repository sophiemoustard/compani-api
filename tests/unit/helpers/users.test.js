const { ObjectID } = require('mongodb');
const expect = require('expect');
const sinon = require('sinon');
const Boom = require('boom');
const flat = require('flat');
const cloneDeep = require('lodash/cloneDeep');
const UsersHelper = require('../../../src/helpers/users');
const RolesHelper = require('../../../src/helpers/roles');
const translate = require('../../../src/helpers/translate');
const GdriveStorageHelper = require('../../../src/helpers/gdriveStorage');
const User = require('../../../src/models/User');
const Role = require('../../../src/models/Role');
const Task = require('../../../src/models/Task');

require('sinon-mongoose');

const { language } = translate;

describe('getUsers', () => {
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

    const result = await UsersHelper.getUsers(query, credentials);
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

    const result = await UsersHelper.getUsers(query, credentials);
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

    const result = await UsersHelper.getUsers(query, credentials);
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
      await UsersHelper.getUsers(query, credentials);
    } catch (e) {
      expect(e).toEqual(Boom.notFound(translate[language].roleNotFound));
    }

    RoleMock.verify();
    UserMock.verify();
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
    const administrativeKey = 'cni';
    const params = { _id: new ObjectID(), driveId: '1234567890' };
    const payload = {
      fileName: 'test',
      'Content-type': 'application/pdf',
      cni: 'Ceci est un fichier',
    };

    const result = await UsersHelper.createAndSaveFile(administrativeKey, params, payload);

    expect(result).toEqual(uploadedFile);
    sinon.assert.calledWithExactly(addFileStub, {
      driveFolderId: params.driveId,
      name: payload.fileName,
      type: payload['Content-Type'],
      body: payload[administrativeKey],
    });
    sinon.assert.calledWithExactly(saveFileStub, params._id, administrativeKey, { driveId: uploadedFile.id, link: uploadedFile.webViewLink });
    sinon.assert.notCalled(saveCertificateDriveIdStub);
  });

  it('upload a certificate file on drive and save info to user', async () => {
    const administrativeKey = 'certificates';
    const params = { _id: new ObjectID(), driveId: '1234567890' };
    const payload = {
      fileName: 'test',
      'Content-type': 'application/pdf',
      certificates: 'Ceci est un fichier',
    };

    const result = await UsersHelper.createAndSaveFile(administrativeKey, params, payload);

    expect(result).toEqual(uploadedFile);
    sinon.assert.calledWithExactly(addFileStub, {
      driveFolderId: params.driveId,
      name: payload.fileName,
      type: payload['Content-Type'],
      body: payload[administrativeKey],
    });
    sinon.assert.calledWithExactly(saveCertificateDriveIdStub, params._id, { driveId: uploadedFile.id, link: uploadedFile.webViewLink });
    sinon.assert.notCalled(saveFileStub);
  });
});

describe('createUser', () => {
  let UserMock;
  let TaskMock;
  let populateRoleStub;
  beforeEach(() => {
    UserMock = sinon.mock(User);
    TaskMock = sinon.mock(Task);
    populateRoleStub = sinon.stub(RolesHelper, 'populateRole');
  });

  afterEach(() => {
    UserMock.restore();
    TaskMock.restore();
    populateRoleStub.restore();
  });

  it('should create a user', async () => {
    const payload = {
      identity: { lastname: 'Test', firstname: 'Toto' },
      local: { email: 'toto@test.com', password: '1234567890' },
      role: new ObjectID(),
    };
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
    const newUser = {
      _id: new ObjectID(),
      ...payload,
      role: {
        name: 'auxiliary',
        rights: userRights,
      },
    };
    const tasks = [{ _id: new ObjectID() }, { _id: new ObjectID() }];
    const taskIds = tasks.map(task => ({ task: task._id }));
    const refreshToken = '0987654321';
    const credentials = { company: { _id: new ObjectID() } };

    TaskMock.expects('find').chain('lean').returns(tasks);

    UserMock.expects('create')
      .withExactArgs({
        ...payload,
        company: credentials.company._id,
        refreshToken,
        procedure: taskIds,
      })
      .returns({
        ...newUser,
        procedure: [
          { task: tasks[0]._id, isDone: false, at: null },
          { task: tasks[1]._id, isDone: false, at: null },
        ],
      });

    populateRoleStub.returns(populatedUserRights);

    const result = await UsersHelper.createUser(payload, credentials, refreshToken);

    expect(result).toMatchObject({
      _id: newUser._id.toHexString(),
      role: {
        name: newUser.role.name,
        rights: populatedUserRights,
      },
    });
    TaskMock.verify();
    UserMock.verify();
    sinon.assert.calledWithExactly(populateRoleStub, newUser.role.rights, { onlyGrantedRights: true });
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
