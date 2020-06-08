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
        },
        vendor: {
          name: 'vendor_admin',
        },
      },
      company: { _id: 'company' },
      local: { email: 'email@email.com' },
      customers: [],
      sector: sectorId,
    };
    UserMock.expects('findById')
      .withExactArgs(userId, '_id identity role company local customers')
      .chain('populate')
      .withExactArgs({ path: 'sector', options: { processingAuthentication: true } })
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
          'config:edit',
          'pay:edit',
          'exports:edit',
          'config:read',
          'pay:read',
          'exports:read',
          'users:edit',
          'users:list',
          'events:edit',
          'events:read',
          'customers:create',
          'customers:read',
          'customers:edit',
          'customers:administrative:edit',
          'payments:edit',
          'payments:list:create',
          'bills:edit',
          'bills:read',
          'companies:edit',
          'roles:read',
          'paydocuments:edit',
          'contracts:edit',
          'taxcertificates:read',
          'establishments:read',
          'establishments:edit',
          'taxcertificates:edit',
          'courses:read',
          'courses:edit',
          'sms:send',
          'users:exist',
          'companies:create',
          'scripts:run',
          'companies:read',
          'programs:read',
          'programs:edit',
          'courses:create',
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
        },
      },
      customers: [customerId],
      company: { _id: 'company' },
      local: { email: 'email@email.com' },
      sector: sectorId,
    };
    UserMock.expects('findById')
      .withExactArgs(userId, '_id identity role company local customers')
      .chain('populate')
      .withExactArgs({ path: 'sector', options: { processingAuthentication: true } })
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
        scope: [`user:read-${userId}`, 'helper', `customer-${customerId.toHexString()}`, `user:edit-${userId}`],
        role: { client: { name: 'helper' } },
      },
    });
  });

  it('should authenticate auxiliary without company', async () => {
    const userId = new ObjectID();
    const sectorId = new ObjectID();
    const user = {
      _id: userId,
      identity: { lastname: 'lastname' },
      role: {
        client: {
          name: AUXILIARY_WITHOUT_COMPANY,
        },
      },
      company: { _id: 'company' },
      local: { email: 'email@email.com' },
      customers: [],
      sector: sectorId,
    };
    UserMock.expects('findById')
      .withExactArgs(userId, '_id identity role company local customers')
      .chain('populate')
      .withExactArgs({ path: 'sector', options: { processingAuthentication: true } })
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
        scope: [`user:read-${userId}`, 'auxiliary_without_company'],
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
        },
        vendor: {
          name: 'trainer',
        },
      },
      company: { _id: 'company' },
      local: { email: 'email@email.com' },
      customers: [],
      sector: sectorId,
    };
    UserMock.expects('findById')
      .withExactArgs(userId, '_id identity role company local customers')
      .chain('populate')
      .withExactArgs({ path: 'sector', options: { processingAuthentication: true } })
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
          'pay:edit',
          'exports:edit',
          'config:read',
          'pay:read',
          'exports:read',
          'users:edit',
          'users:list',
          'events:edit',
          'events:read',
          'customers:create',
          'customers:read',
          'customers:edit',
          'customers:administrative:edit',
          'payments:edit',
          'bills:read',
          'roles:read',
          'paydocuments:edit',
          'contracts:edit',
          'taxcertificates:read',
          'establishments:read',
          'taxcertificates:edit',
          'courses:read',
          'courses:edit',
          'sms:send',
          'users:exist',
          `user:edit-${userId}`,
        ],
        role: { client: { name: 'coach' }, vendor: { name: 'trainer' } },
      },
    });
  });
});
