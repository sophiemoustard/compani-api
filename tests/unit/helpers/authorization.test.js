const expect = require('expect');
const sinon = require('sinon');
const { ObjectID } = require('mongodb');
const AuthorizationHelper = require('../../../src/helpers/authorization');
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
    const result = await AuthorizationHelper.validate({});
    expect(result).toEqual({ isValid: false });
  });

  it('should authenticate user without role and company', async () => {
    const userId = new ObjectID();
    const user = {
      _id: userId,
      identity: { lastname: 'lastname' },
      local: { email: 'email@email.com' },
      customers: [],
    };
    UserMock.expects('findById')
      .withExactArgs(userId, '_id identity role company local customers')
      .chain('populate')
      .withExactArgs({ path: 'sector', options: { requestingOwnInfos: true } })
      .chain('lean')
      .withExactArgs({ autopopulate: true })
      .once()
      .returns(user);

    const result = await AuthorizationHelper.validate({ _id: userId });

    expect(result).toEqual({
      isValid: true,
      credentials: {
        _id: userId,
        identity: { lastname: 'lastname' },
        email: 'email@email.com',
        scope: [`user:read-${userId}`, `user:edit-${userId}`],
        role: {},
        sector: null,
        company: null,
      },
    });
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
      .withExactArgs({ path: 'sector', options: { requestingOwnInfos: true } })
      .chain('lean')
      .withExactArgs({ autopopulate: true })
      .once()
      .returns(user);

    const result = await AuthorizationHelper.validate({ _id: userId });

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
          `user:edit-${userId}`,
          'client_admin',
          'vendor_admin',
          'attendancesheets:read',
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
          'partnerorganizations:edit',
          'roles:read',
          'sms:send',
          'taxcertificates:edit',
          'taxcertificates:read',
          'users:edit',
          'users:exist',
          'users:list',
          'attendancesheets:edit',
          'companies:create',
          'companies:edit',
          'companies:read',
          'courses:create',
          'programs:edit',
          'programs:read',
          'scripts:run',
          'questionnaires:edit',
          'questionnaires:read',
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
      .withExactArgs({ path: 'sector', options: { requestingOwnInfos: true } })
      .chain('lean')
      .withExactArgs({ autopopulate: true })
      .once()
      .returns(user);

    const result = await AuthorizationHelper.validate({ _id: userId });

    expect(result).toEqual({
      isValid: true,
      credentials: {
        _id: userId,
        identity: { lastname: 'lastname' },
        email: 'email@email.com',
        company: { _id: 'company' },
        sector: sectorId.toHexString(),
        scope: [`user:read-${userId}`, `user:edit-${userId}`, 'helper', `customer-${customerId.toHexString()}`],
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
      .withExactArgs({ path: 'sector', options: { requestingOwnInfos: true } })
      .chain('lean')
      .withExactArgs({ autopopulate: true })
      .once()
      .returns(user);

    const result = await AuthorizationHelper.validate({ _id: userId });

    expect(result).toEqual({
      isValid: true,
      credentials: {
        _id: userId,
        identity: { lastname: 'lastname' },
        email: 'email@email.com',
        company: { _id: 'company' },
        sector: sectorId.toHexString(),
        scope: [`user:read-${userId}`, `user:edit-${userId}`, 'auxiliary_without_company'],
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
      .withExactArgs({ path: 'sector', options: { requestingOwnInfos: true } })
      .chain('lean')
      .withExactArgs({ autopopulate: true })
      .once()
      .returns(user);

    const result = await AuthorizationHelper.validate({ _id: userId });

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
          `user:edit-${userId}`,
          'coach',
          'trainer',
          'attendancesheets:read',
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
          'partnerorganizations:edit',
          'roles:read',
          'sms:send',
          'taxcertificates:edit',
          'taxcertificates:read',
          'users:edit',
          'users:exist',
          'users:list',
          'attendancesheets:edit',
        ],
        role: { client: { name: 'coach' }, vendor: { name: 'trainer' } },
      },
    });
    UserMock.verify();
  });
});
