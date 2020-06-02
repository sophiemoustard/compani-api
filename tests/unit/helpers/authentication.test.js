const expect = require('expect');
const sinon = require('sinon');
const { ObjectID } = require('mongodb');
const AuthenticationHelper = require('../../../src/helpers/authentication');
const User = require('../../../src/models/User');
const { AUXILIARY_WITHOUT_COMPANY } = require('../../../src/helpers/constants');
require('sinon-mongoose');

describe('validate', () => {
  let UserMock;
  beforeEach(() => {
    UserMock = sinon.mock(User);
  });
  afterEach(() => {
    UserMock.restore();
  });

  it('should not authenticate as user does not exist', async () => {
    const result = await AuthenticationHelper.validate({});
    expect(result).toEqual({ isValid: false });
  });

  it('should not authenticate as user does not have company', async () => {
    const userId = new ObjectID();
    const user = {
      _id: userId,
      identity: { lastname: 'lastname' },
      role: { client: { name: 'coach' }, vendor: { name: 'admin' } },
      local: { email: 'email@email.com' },
      customers: [],
      sector: new ObjectID(),
    };
    UserMock.expects('findById')
      .withExactArgs(userId, '_id identity role company local customers sector')
      .chain('lean')
      .withExactArgs({ autopopulate: true })
      .once()
      .returns(user);

    const result = await AuthenticationHelper.validate({ _id: userId });

    expect(result).toEqual({ isValid: false });
  });

  it('should not authenticate if roles do not exist', async () => {
    const userId = new ObjectID();
    const user = {
      _id: userId,
      identity: { lastname: 'lastname' },
      role: { client: null, vendor: null },
      local: { email: 'email@email.com' },
      customers: [],
      sector: new ObjectID(),
    };
    UserMock.expects('findById')
      .withExactArgs(userId, '_id identity role company local customers sector')
      .chain('lean')
      .withExactArgs({ autopopulate: true })
      .once()
      .returns(user);

    const result = await AuthenticationHelper.validate({ _id: userId });

    expect(result).toEqual({ isValid: false });
  });

  it('should authenticate user', async () => {
    const userId = new ObjectID();
    const sectorId = new ObjectID();
    const user = {
      _id: userId,
      identity: { lastname: 'lastname' },
      role: {
        client: {
          name: 'client_admin',
          rights: [{ hasAccess: true, permission: 'top' }, { hasAccess: false, permission: 'bad' }],
        },
        vendor: {
          name: 'vendor_admin',
          rights: [{ hasAccess: true, permission: 'bof' }, { hasAccess: true, permission: 'bien' }],
        },
      },
      company: { _id: 'company' },
      local: { email: 'email@email.com' },
      customers: [],
      sector: sectorId,
    };
    UserMock.expects('findById')
      .withExactArgs(userId, '_id identity role company local customers sector')
      .chain('lean')
      .withExactArgs({ autopopulate: true })
      .once()
      .returns(user);

    const result = await AuthenticationHelper.validate({ _id: userId });

    expect(result).toEqual({
      isValid: true,
      credentials: {
        _id: userId,
        identity: { lastname: 'lastname' },
        email: 'email@email.com',
        company: { _id: 'company' },
        sector: sectorId.toHexString(),
        scope: [
          `user:read-${userId}`,
          'client_admin',
          'vendor_admin',
          'top',
          'bof',
          'bien',
          `user:edit-${userId}`,
          `company-${user.company._id}`,
        ],
        role: { client: { name: 'client_admin' }, vendor: { name: 'vendor_admin' } },
      },
    });
  });

  it('should authenticate user with customers', async () => {
    const userId = new ObjectID();
    const sectorId = new ObjectID();
    const customerId = new ObjectID();
    const user = {
      _id: userId,
      identity: { lastname: 'lastname' },
      role: {
        client: {
          name: 'helper',
          rights: [{ hasAccess: true, permission: 'top' }, { hasAccess: false, permission: 'bad' }],
        },
      },
      customers: [customerId],
      company: { _id: 'company' },
      local: { email: 'email@email.com' },
      sector: sectorId,
    };
    UserMock.expects('findById')
      .withExactArgs(userId, '_id identity role company local customers sector')
      .chain('lean')
      .withExactArgs({ autopopulate: true })
      .once()
      .returns(user);

    const result = await AuthenticationHelper.validate({ _id: userId });

    expect(result).toEqual({
      isValid: true,
      credentials: {
        _id: userId,
        identity: { lastname: 'lastname' },
        email: 'email@email.com',
        company: { _id: 'company' },
        sector: sectorId.toHexString(),
        scope: [`user:read-${userId}`, 'helper', 'top', `customer-${customerId.toHexString()}`, `user:edit-${userId}`],
        role: { client: { name: 'helper' } },
      },
    });
  });

  it('should authenticate auxiliary without comapny', async () => {
    const userId = new ObjectID();
    const sectorId = new ObjectID();
    const user = {
      _id: userId,
      identity: { lastname: 'lastname' },
      role: {
        client: {
          name: AUXILIARY_WITHOUT_COMPANY,
          rights: [{ hasAccess: true, permission: 'top' }, { hasAccess: false, permission: 'bad' }],
        },
      },
      company: { _id: 'company' },
      local: { email: 'email@email.com' },
      customers: [],
      sector: sectorId,
    };
    UserMock.expects('findById')
      .withExactArgs(userId, '_id identity role company local customers sector')
      .chain('lean')
      .withExactArgs({ autopopulate: true })
      .once()
      .returns(user);

    const result = await AuthenticationHelper.validate({ _id: userId });

    expect(result).toEqual({
      isValid: true,
      credentials: {
        _id: userId,
        identity: { lastname: 'lastname' },
        email: 'email@email.com',
        company: { _id: 'company' },
        sector: sectorId.toHexString(),
        scope: [`user:read-${userId}`, 'auxiliary_without_company', 'top'],
        role: { client: { name: AUXILIARY_WITHOUT_COMPANY } },
      },
    });
  });

  it('should authenticate trainer', async () => {
    const userId = new ObjectID();
    const sectorId = new ObjectID();
    const user = {
      _id: userId,
      identity: { lastname: 'lastname' },
      role: {
        client: {
          name: 'coach',
          rights: [{ hasAccess: true, permission: 'top' }, { hasAccess: false, permission: 'bad' }],
        },
        vendor: {
          name: 'trainer',
          rights: [{ hasAccess: true, permission: 'bof' }, { hasAccess: true, permission: 'bien' }],
        },
      },
      company: { _id: 'company' },
      local: { email: 'email@email.com' },
      customers: [],
      sector: sectorId,
    };
    UserMock.expects('findById')
      .withExactArgs(userId, '_id identity role company local customers sector')
      .chain('lean')
      .withExactArgs({ autopopulate: true })
      .once()
      .returns(user);

    const result = await AuthenticationHelper.validate({ _id: userId });

    expect(result).toEqual({
      isValid: true,
      credentials: {
        _id: userId,
        identity: { lastname: 'lastname' },
        email: 'email@email.com',
        company: { _id: 'company' },
        sector: sectorId.toHexString(),
        scope: [
          `user:read-${userId}`,
          'coach',
          'trainer',
          'top',
          'bof',
          'bien',
          `user:edit-${userId}`,
        ],
        role: { client: { name: 'coach' }, vendor: { name: 'trainer' } },
      },
    });
  });
});
