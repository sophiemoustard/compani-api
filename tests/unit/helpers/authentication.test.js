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
      .withExactArgs(userId, '_id identity role company local customers')
      .chain('populate')
      .withExactArgs({ path: 'sector', options: { processingAuthentication: true } })
      .chain('lean')
      .withExactArgs({ autopopulate: true })
      .once()
      .returns(user);

    const result = await AuthenticationHelper.validate({ _id: userId });

    expect(result).toEqual({ isValid: false });
    UserMock.verify();
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
      .withExactArgs(userId, '_id identity role company local customers')
      .chain('populate')
      .withExactArgs({ path: 'sector', options: { processingAuthentication: true } })
      .chain('lean')
      .withExactArgs({ autopopulate: true })
      .once()
      .returns(user);

    const result = await AuthenticationHelper.validate({ _id: userId });

    expect(result).toEqual({ isValid: false });
    UserMock.verify();
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
          'bills:edit',
          'bills:read',
          'config:edit',
          'config:read',
          'contracts:edit',
          'courses:edit',
          'courses:read',
          'customers:administrative:edit',
          'customers:create',
          'customers:edit',
          'customers:read',
          'establishments:edit',
          'establishments:read',
          'events:edit',
          'events:read',
          'exports:edit',
          'exports:read',
          'pay:edit',
          'pay:read',
          'paydocuments:edit',
          'payments:edit',
          'payments:list:create',
          'roles:read',
          'sms:send',
          'taxcertificates:edit',
          'taxcertificates:read',
          'users:edit',
          'users:exist',
          'users:list',
          'companies:create',
          'companies:edit',
          'companies:read',
          'courses:create',
          'programs:edit',
          'programs:read',
          'scripts:run',
          `user:edit-${userId}`,
          `company-${user.company._id}`,
        ],
        role: { client: { name: 'client_admin' }, vendor: { name: 'vendor_admin' } },
      },
    });
    UserMock.verify();
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
    UserMock.verify();
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
    UserMock.verify();
  });

  it('should authenticate a user with coach and trainer role', async () => {
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
          'bills:read',
          'config:read',
          'contracts:edit',
          'courses:edit',
          'courses:read',
          'customers:administrative:edit',
          'customers:create',
          'customers:edit',
          'customers:read',
          'establishments:read',
          'events:edit',
          'events:read',
          'exports:edit',
          'exports:read',
          'pay:read',
          'paydocuments:edit',
          'roles:read',
          'sms:send',
          'taxcertificates:edit',
          'taxcertificates:read',
          'users:edit',
          'users:exist',
          'users:list',
          `user:edit-${userId}`,
        ],
        role: { client: { name: 'coach' }, vendor: { name: 'trainer' } },
      },
    });
    UserMock.verify();
  });
});
