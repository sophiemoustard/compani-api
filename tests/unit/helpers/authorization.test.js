const expect = require('expect');
const sinon = require('sinon');
const { ObjectID } = require('mongodb');
const AuthorizationHelper = require('../../../src/helpers/authorization');
const User = require('../../../src/models/User');
const { AUXILIARY_WITHOUT_COMPANY } = require('../../../src/helpers/constants');
const SinonMongoose = require('../sinonMongoose');

describe('validate', () => {
  let findById;
  beforeEach(() => {
    findById = sinon.stub(User, 'findById');
  });
  afterEach(() => {
    findById.restore();
  });

  it('should not authenticate as user does not exist', async () => {
    const result = await AuthorizationHelper.validate({});
    expect(result).toEqual({ isValid: false });
  });

  it('should authenticate user without role and company', async () => {
    const userId = new ObjectID();
    const user = { _id: userId, identity: { lastname: 'lastname' }, local: { email: 'email@email.com' } };

    findById.returns(SinonMongoose.stubChainedQueries([user]));

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
    SinonMongoose.calledWithExactly(
      findById,
      [
        { query: 'findById', args: [userId, '_id identity role company local'] },
        { query: 'populate', args: [{ path: 'sector', options: { requestingOwnInfos: true } }] },
        { query: 'populate', args: [{ path: 'customers', options: { requestingOwnInfos: true } }] },
        { query: 'lean', args: [{ autopopulate: true }] },
      ]
    );
  });

  it('should authenticate user', async () => {
    const userId = new ObjectID();
    const sectorId = new ObjectID();
    const user = {
      _id: userId,
      identity: { lastname: 'lastname' },
      role: { client: { name: 'client_admin' }, vendor: { name: 'vendor_admin' } },
      company: { _id: 'company' },
      local: { email: 'email@email.com' },
      sector: sectorId,
    };

    findById.returns(SinonMongoose.stubChainedQueries([user]));

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
          'customerpartners:edit',
          'establishments:edit',
          'establishments:read',
          'events:edit',
          'events:read',
          'exports:edit',
          'exports:read',
          'helpers:list',
          'helpers:edit',
          'pay:edit',
          'pay:read',
          'paydocuments:edit',
          'payments:edit',
          'partnerorganizations:edit',
          'partners:read',
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
          'questionnaires:edit',
          'questionnaires:read',
          'scripts:run',
          `company-${user.company._id}`,
        ],
        role: { client: { name: 'client_admin' }, vendor: { name: 'vendor_admin' } },
      },
    });
    SinonMongoose.calledWithExactly(
      findById,
      [
        { query: 'findById', args: [userId, '_id identity role company local'] },
        { query: 'populate', args: [{ path: 'sector', options: { requestingOwnInfos: true } }] },
        { query: 'populate', args: [{ path: 'customers', options: { requestingOwnInfos: true } }] },
        { query: 'lean', args: [{ autopopulate: true }] },
      ]
    );
  });

  it('should authenticate user with customers', async () => {
    const userId = new ObjectID();
    const sectorId = new ObjectID();
    const customerId = new ObjectID();
    const user = {
      _id: userId,
      identity: { lastname: 'lastname' },
      role: { client: { name: 'helper' } },
      customers: [customerId],
      company: { _id: 'company' },
      local: { email: 'email@email.com' },
      sector: sectorId,
    };

    findById.returns(SinonMongoose.stubChainedQueries([user]));

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
    SinonMongoose.calledWithExactly(
      findById,
      [
        { query: 'findById', args: [userId, '_id identity role company local'] },
        { query: 'populate', args: [{ path: 'sector', options: { requestingOwnInfos: true } }] },
        { query: 'populate', args: [{ path: 'customers', options: { requestingOwnInfos: true } }] },
        { query: 'lean', args: [{ autopopulate: true }] },
      ]
    );
  });

  it('should authenticate auxiliary without company', async () => {
    const userId = new ObjectID();
    const sectorId = new ObjectID();
    const user = {
      _id: userId,
      identity: { lastname: 'lastname' },
      role: { client: { name: AUXILIARY_WITHOUT_COMPANY } },
      company: { _id: 'company' },
      local: { email: 'email@email.com' },
      sector: sectorId,
    };

    findById.returns(SinonMongoose.stubChainedQueries([user]));

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
    SinonMongoose.calledWithExactly(
      findById,
      [
        { query: 'findById', args: [userId, '_id identity role company local'] },
        { query: 'populate', args: [{ path: 'sector', options: { requestingOwnInfos: true } }] },
        { query: 'populate', args: [{ path: 'customers', options: { requestingOwnInfos: true } }] },
        { query: 'lean', args: [{ autopopulate: true }] },
      ]
    );
  });

  it('should authenticate a user with coach and trainer role', async () => {
    const userId = new ObjectID();
    const sectorId = new ObjectID();
    const user = {
      _id: userId,
      identity: { lastname: 'lastname' },
      role: { client: { name: 'coach' }, vendor: { name: 'trainer' } },
      company: { _id: 'company' },
      local: { email: 'email@email.com' },
      sector: sectorId,
    };

    findById.returns(SinonMongoose.stubChainedQueries([user]));

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
          'customerpartners:edit',
          'establishments:read',
          'events:edit',
          'events:read',
          'exports:edit',
          'exports:read',
          'helpers:list',
          'helpers:edit',
          'pay:read',
          'paydocuments:edit',
          'partnerorganizations:edit',
          'partners:read',
          'roles:read',
          'sms:send',
          'taxcertificates:edit',
          'taxcertificates:read',
          'users:edit',
          'users:exist',
          'users:list',
          'attendancesheets:edit',
          'questionnaires:read',
        ],
        role: { client: { name: 'coach' }, vendor: { name: 'trainer' } },
      },
    });
    SinonMongoose.calledWithExactly(
      findById,
      [
        { query: 'findById', args: [userId, '_id identity role company local'] },
        { query: 'populate', args: [{ path: 'sector', options: { requestingOwnInfos: true } }] },
        { query: 'populate', args: [{ path: 'customers', options: { requestingOwnInfos: true } }] },
        { query: 'lean', args: [{ autopopulate: true }] },
      ]
    );
  });
});
