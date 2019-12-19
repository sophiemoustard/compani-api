const Boom = require('boom');
const ActivationCodeHelper = require('../../../src/helpers/activationCode');
const ActivationCode = require('../../../src/models/ActivationCode');
const authenticationHelper = require('../../../src/helpers/authentication');
const sinon = require('sinon');
const { ObjectID } = require('mongodb');
const expect = require('expect');

require('sinon-mongoose');

describe('createActivationCode', () => {
  let createStub;
  beforeEach(() => {
    createStub = sinon.stub(ActivationCode, 'create');
  });

  afterEach(() => {
    createStub.restore();
  });

  it('should create activation code', async () => {
    const credentials = { company: { _id: new ObjectID() } };
    createStub.returnsArg(0);
    const payload = { user: new ObjectID(), code: '1234' };

    const activationCode = await ActivationCodeHelper.createActivationCode(payload, credentials);

    expect(activationCode).toBeDefined();
  });
});

describe('checkActivationCode', () => {
  let ActivationCodeModel;
  let encodeStub;

  const params = { code: '1234' };
  beforeEach(() => {
    ActivationCodeModel = sinon.mock(ActivationCode);
    encodeStub = sinon.stub(authenticationHelper, 'encode');
  });

  afterEach(() => {
    ActivationCodeModel.restore();
    encodeStub.restore();
  });

  it('should check activation code', async () => {
    const code = { user: { isConfirmed: false, _id: new ObjectID() } };
    ActivationCodeModel
      .expects('findOne')
      .withExactArgs({ code: params.code })
      .chain('populate')
      .withExactArgs({ path: 'user', select: '_id isConfirmed local.email' })
      .chain('lean')
      .returns(code);
    encodeStub.returns('4321');

    const result = await ActivationCodeHelper.checkActivationCode(params);
    expect(result).toEqual({ ...code, token: '4321' });
    ActivationCodeModel.verify();
  });

  it('should check activation code even if isConfirmed is not defined', async () => {
    const code = { user: { _id: new ObjectID() } };
    ActivationCodeModel
      .expects('findOne')
      .withExactArgs({ code: params.code })
      .chain('populate')
      .withExactArgs({ path: 'user', select: '_id isConfirmed local.email' })
      .chain('lean')
      .returns(code);
    encodeStub.returns('4321');

    const result = await ActivationCodeHelper.checkActivationCode(params);
    expect(result).toEqual({ ...code, token: '4321' });
    ActivationCodeModel.verify();
  });

  it('should return a 500 if user is confirmed', async () => {
    try {
      const code = { user: { isConfirmed: true } };
      ActivationCodeModel
        .expects('findOne')
        .withExactArgs({ code: params.code })
        .chain('populate')
        .withExactArgs({ path: 'user', select: '_id isConfirmed local.email' })
        .chain('lean')
        .returns(code);
      encodeStub.returns('4321');

      await ActivationCodeHelper.checkActivationCode(params);
    } catch (e) {
      expect(e).toEqual(Boom.badData());
    } finally {
      sinon.assert.notCalled(encodeStub);
      ActivationCodeModel.verify();
    }
  });
});
