const { ObjectID } = require('mongodb');
const expect = require('expect');
const { fn: momentProto } = require('moment');
const sinon = require('sinon');
const Boom = require('@hapi/boom');
const flat = require('flat');
const bcrypt = require('bcrypt');
const AuthenticationHelper = require('../../../src/helpers/authentication');
const EmailHelper = require('../../../src/helpers/email');
const translate = require('../../../src/helpers/translate');
const { TOKEN_EXPIRE_TIME } = require('../../../src/models/User');
const User = require('../../../src/models/User');

require('sinon-mongoose');

const { language } = translate;

describe('authenticate', () => {
  let UserMock;
  let compare;
  let encode;
  let momentToDate;
  let momentAdd;
  beforeEach(() => {
    UserMock = sinon.mock(User);
    compare = sinon.stub(bcrypt, 'compare');
    encode = sinon.stub(AuthenticationHelper, 'encode');
    momentToDate = sinon.stub(momentProto, 'toDate');
    momentAdd = sinon.stub(momentProto, 'add').returns({ toDate: sinon.stub().returns('2020-12-09T13:45:25.437Z') });
  });
  afterEach(() => {
    UserMock.restore();
    compare.restore();
    encode.restore();
    momentToDate.restore();
    momentAdd.restore();
  });

  it('should authenticate user and set firstMobileConnection', async () => {
    const payload = { email: 'toto@email.com', password: 'toto', origin: 'mobile' };
    const user = {
      _id: new ObjectID(),
      refreshToken: 'token',
      local: { password: 'toto' },
    };
    momentToDate.onCall(0).returns('2020-12-08T13:45:25.437Z');

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

    const result = await AuthenticationHelper.authenticate(payload);

    expect(result).toEqual({
      token: 'token',
      tokenExpireDate: '2020-12-09T13:45:25.437Z',
      refreshToken: user.refreshToken,
      user: { _id: user._id.toHexString() },
    });
    UserMock.verify();
    sinon.assert.calledOnceWithExactly(compare, payload.password, 'toto');
    sinon.assert.calledOnceWithExactly(encode, { _id: user._id.toHexString() }, TOKEN_EXPIRE_TIME);
    sinon.assert.calledOnceWithExactly(momentAdd, TOKEN_EXPIRE_TIME, 'seconds');
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

    const result = await AuthenticationHelper.authenticate(payload);

    expect(result).toEqual({
      token: 'token',
      tokenExpireDate: '2020-12-09T13:45:25.437Z',
      refreshToken: user.refreshToken,
      user: { _id: user._id.toHexString() },
    });
    UserMock.verify();
    sinon.assert.notCalled(momentToDate);
    sinon.assert.calledOnceWithExactly(compare, payload.password, 'toto');
    sinon.assert.calledOnceWithExactly(encode, { _id: user._id.toHexString() }, TOKEN_EXPIRE_TIME);
    sinon.assert.calledOnceWithExactly(momentAdd, TOKEN_EXPIRE_TIME, 'seconds');
  });

  it('should authenticate user but not set firstMobileConnection (firstMobileConnection already set)', async () => {
    const payload = { email: 'toto@email.com', password: 'toto', origin: 'mobile' };
    const user = {
      _id: new ObjectID(),
      refreshToken: 'token',
      local: { password: 'toto' },
      firstMobileConnection: '2020-12-08T13:45:25.437Z',
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

    const result = await AuthenticationHelper.authenticate(payload);

    expect(result).toEqual({
      token: 'token',
      tokenExpireDate: '2020-12-09T13:45:25.437Z',
      refreshToken: user.refreshToken,
      user: { _id: user._id.toHexString() },
    });
    UserMock.verify();
    sinon.assert.notCalled(momentToDate);
    sinon.assert.calledOnceWithExactly(compare, payload.password, 'toto');
    sinon.assert.calledOnceWithExactly(encode, { _id: user._id.toHexString() }, TOKEN_EXPIRE_TIME);
    sinon.assert.calledOnceWithExactly(momentAdd, TOKEN_EXPIRE_TIME, 'seconds');
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

      await AuthenticationHelper.authenticate(payload);
    } catch (e) {
      expect(e.output.statusCode).toEqual(401);
    } finally {
      UserMock.verify();
      sinon.assert.calledOnceWithExactly(compare, '123456!eR', '');
      sinon.assert.notCalled(encode);
      sinon.assert.notCalled(momentToDate);
      sinon.assert.notCalled(momentAdd);
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

      await AuthenticationHelper.authenticate(payload);
    } catch (e) {
      expect(e.output.statusCode).toEqual(401);
    } finally {
      UserMock.verify();
      sinon.assert.calledOnceWithExactly(compare, '123456!eR', '');
      sinon.assert.notCalled(encode);
      sinon.assert.notCalled(momentToDate);
      sinon.assert.notCalled(momentAdd);
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

      await AuthenticationHelper.authenticate(payload);
    } catch (e) {
      expect(e.output.statusCode).toEqual(401);
    } finally {
      UserMock.verify();
      sinon.assert.calledOnceWithExactly(compare, payload.password, 'password_hash');
      sinon.assert.notCalled(encode);
      sinon.assert.notCalled(momentToDate);
      sinon.assert.notCalled(momentAdd);
    }
  });
});

describe('refreshToken', () => {
  let UserMock;
  let encode;
  let momentAdd;
  beforeEach(() => {
    UserMock = sinon.mock(User);
    encode = sinon.stub(AuthenticationHelper, 'encode');
    momentAdd = sinon.stub(momentProto, 'add').returns({ toDate: sinon.stub().returns('2020-12-09T13:45:25.437Z') });
  });
  afterEach(() => {
    UserMock.restore();
    encode.restore();
    momentAdd.restore();
  });

  it('should throw an error if user does not exist', async () => {
    try {
      const refreshToken = 'token';
      UserMock.expects('findOne')
        .withExactArgs({ refreshToken })
        .chain('lean')
        .once()
        .returns(null);

      await AuthenticationHelper.refreshToken(refreshToken);
    } catch (e) {
      expect(e).toEqual(Boom.unauthorized());
    } finally {
      UserMock.verify();
      sinon.assert.notCalled(encode);
      sinon.assert.notCalled(momentAdd);
    }
  });

  it('should return refresh token', async () => {
    const refreshToken = 'token';
    const user = {
      _id: new ObjectID(),
      refreshToken: 'token',
      local: { password: 'toto' },
    };

    UserMock.expects('findOne')
      .withExactArgs({ refreshToken })
      .chain('lean')
      .once()
      .returns(user);
    encode.returns('token');

    const result = await AuthenticationHelper.refreshToken(refreshToken);

    expect(result).toEqual({
      token: 'token',
      tokenExpireDate: '2020-12-09T13:45:25.437Z',
      refreshToken: 'token',
      user: { _id: user._id.toHexString() },
    });
    UserMock.verify();
    sinon.assert.calledWithExactly(encode, { _id: user._id.toHexString() }, TOKEN_EXPIRE_TIME);
    sinon.assert.calledOnceWithExactly(momentAdd, TOKEN_EXPIRE_TIME, 'seconds');
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

    const result = await AuthenticationHelper.updatePassword(userId, payload);

    expect(result).toEqual({ ...user, ...payload });
    UserMock.verify();
  });
});

describe('checkPasswordToken', () => {
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

      await AuthenticationHelper.checkPasswordToken(token);
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

    const result = await AuthenticationHelper.checkPasswordToken(token);

    expect(result).toEqual({ token, user: userPayload });
    UserMock.verify();
    sinon.assert.calledWithExactly(encode, userPayload, TOKEN_EXPIRE_TIME);
  });
});

describe('createPasswordToken', () => {
  let generatePasswordTokenStub;
  const email = 'toto@toto.com';

  beforeEach(() => {
    generatePasswordTokenStub = sinon.stub(AuthenticationHelper, 'generatePasswordToken');
  });
  afterEach(() => {
    generatePasswordTokenStub.restore();
  });

  it('should return a new password token', async () => {
    generatePasswordTokenStub.returns({ token: '123456789' });
    const passwordToken = await AuthenticationHelper.createPasswordToken(email);
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
    generatePasswordTokenStub = sinon.stub(AuthenticationHelper, 'generatePasswordToken');
  });
  afterEach(() => {
    forgotPasswordEmail.restore();
    generatePasswordTokenStub.restore();
  });

  it('should return a new access token after checking reset password token', async () => {
    generatePasswordTokenStub.returns({ token: '123456789' });
    forgotPasswordEmail.returns({ sent: true });

    const result = await AuthenticationHelper.forgotPassword(email);

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

      await AuthenticationHelper.generatePasswordToken(email, 3600000);
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

    const result = await AuthenticationHelper.generatePasswordToken(email, 3600000);

    expect(result).toEqual(payload.passwordToken);
    UserMock.verify();
  });
});
