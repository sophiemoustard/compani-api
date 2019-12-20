const expect = require('expect');
const sinon = require('sinon');
const app = require('../../server');
const { populateDB, emailUser, emailUserFromOtherCompany } = require('./seed/emailSeed');
const { getToken, getTokenByCredentials, authCompany, otherCompany } = require('./seed/authenticationSeed');
const EmailOptionsHelper = require('../../src/helpers/emailOptions');
const NodemailerHelper = require('../../src/helpers/nodemailer');


describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('EMAIL ROUTES', () => {
  let EmailOptionsHelperStub;
  let NodemailerHelperStub;
  const payload = { receiver: { email: emailUser.local.email, password: 'mdp' } };
  const sentObj = { msg: 'Message sent !' };

  beforeEach(populateDB);

  beforeEach(() => {
    EmailOptionsHelperStub = sinon.stub(EmailOptionsHelper, 'welcomeEmailContent');
    NodemailerHelperStub = sinon
      .stub(NodemailerHelper, 'testTransporter')
      .returns({ sendMail: sinon.stub().returns(sentObj) });
  });

  afterEach(() => {
    EmailOptionsHelperStub.restore();
    NodemailerHelperStub.restore();
  });

  it('should send a welcoming email to newly registered helpers of a company (company A)', async () => {
    const authToken = await getToken('admin');
    const response = await app.inject({
      method: 'POST',
      url: '/email/sendWelcome',
      headers: { 'x-access-token': authToken },
      payload,
    });

    expect(response.statusCode).toBe(200);
    expect(response.result.data.mailInfo).toMatchObject(sentObj);
    sinon.assert.calledWithExactly(EmailOptionsHelperStub, payload.receiver, authCompany.tradeName);
    sinon.assert.calledOnce(NodemailerHelperStub);
  });

  it('should send a welcoming email to newly registered helpers of a company (company B)', async () => {
    const authToken = await getTokenByCredentials(emailUserFromOtherCompany.local);
    const response = await app.inject({
      method: 'POST',
      url: '/email/sendWelcome',
      headers: { 'x-access-token': authToken },
      payload: { receiver: { email: emailUserFromOtherCompany.local.email, password: '1234567890' } },
    });

    expect(response.statusCode).toBe(200);
    expect(response.result.data.mailInfo).toMatchObject(sentObj);
    sinon.assert.calledWithExactly(
      EmailOptionsHelperStub,
      { email: emailUserFromOtherCompany.local.email, password: '1234567890' },
      otherCompany.tradeName
    );
    sinon.assert.calledOnce(NodemailerHelperStub);
  });

  it('should throw an error if email is from an other company', async () => {
    const authToken = await getToken('admin');
    const response = await app.inject({
      method: 'POST',
      url: '/email/sendWelcome',
      headers: { 'x-access-token': authToken },
      payload: { receiver: { email: emailUserFromOtherCompany.local.email, password: '1234567890' } },
    });

    expect(response.statusCode).toBe(403);
  });

  it('should throw an error if email does not exist', async () => {
    const authToken = await getToken('admin');
    const response = await app.inject({
      method: 'POST',
      url: '/email/sendWelcome',
      headers: { 'x-access-token': authToken },
      payload: { receiver: { email: 'qwertyuiop@asdfghjkl.fr', password: '1234567890' } },
    });

    expect(response.statusCode).toBe(404);
  });

  it("should return a 400 error if 'receiver' param is missing", async () => {
    const authToken = await getToken('admin');
    const response = await app.inject({
      method: 'POST',
      url: '/email/sendWelcome',
      headers: { 'x-access-token': authToken },
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });
});
