const expect = require('expect');
const sinon = require('sinon');
const omit = require('lodash/omit');
const app = require('../../server');
const { populateDB, emailUser, emailUserFromOtherCompany, trainerFromOtherCompany } = require('./seed/emailSeed');
const { getToken, getTokenByCredentials } = require('./helpers/authentication');
const NodemailerHelper = require('../../src/helpers/nodemailer');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('EMAIL ROUTES', () => {
  const payload = { email: emailUser.local.email, type: 'helper' };
  beforeEach(populateDB);
  let sendinBlueTransporter;
  beforeEach(() => {
    sendinBlueTransporter = sinon.stub(NodemailerHelper, 'sendinBlueTransporter')
      .returns({ sendMail: sinon.stub().returns('emailSent') });
  });
  afterEach(() => {
    sendinBlueTransporter.restore();
  });

  it('should send a welcoming email to newly registered helpers of a company (company A)', async () => {
    const authToken = await getToken('client_admin');
    const response = await app.inject({
      method: 'POST',
      url: '/email/send-welcome',
      headers: { Cookie: `alenvi_token=${authToken}` },
      payload,
    });

    expect(response.statusCode).toBe(200);
    expect(response.result.data.mailInfo).toEqual('emailSent');
    sinon.assert.calledWithExactly(sendinBlueTransporter);
  });

  it('should send a welcoming email to newly registered helpers of a company (company B)', async () => {
    const authToken = await getTokenByCredentials(emailUserFromOtherCompany.local);
    const response = await app.inject({
      method: 'POST',
      url: '/email/send-welcome',
      headers: { Cookie: `alenvi_token=${authToken}` },
      payload: { ...payload, email: emailUserFromOtherCompany.local.email },
    });

    expect(response.statusCode).toBe(200);
    expect(response.result.data.mailInfo).toEqual('emailSent');
    sinon.assert.calledWithExactly(sendinBlueTransporter);
  });

  it('should send a welcoming email from trainer to newly registered trainee ', async () => {
    const authToken = await getToken('trainer');
    const response = await app.inject({
      method: 'POST',
      url: '/email/send-welcome',
      headers: { Cookie: `alenvi_token=${authToken}` },
      payload: { type: 'trainee', email: emailUser.local.email },
    });

    expect(response.statusCode).toBe(200);
  });

  it('should not throw an error if trainer is from an other company and user is vendor', async () => {
    const authToken = await getToken('vendor_admin');
    const response = await app.inject({
      method: 'POST',
      url: '/email/send-welcome',
      headers: { Cookie: `alenvi_token=${authToken}` },
      payload: { type: 'trainer', email: trainerFromOtherCompany.local.email },
    });

    expect(response.statusCode).toBe(200);
  });

  it('should throw an error if email is from an other company', async () => {
    const authToken = await getToken('client_admin');
    const response = await app.inject({
      method: 'POST',
      url: '/email/send-welcome',
      headers: { Cookie: `alenvi_token=${authToken}` },
      payload: { ...payload, email: emailUserFromOtherCompany.local.email },
    });

    expect(response.statusCode).toBe(404);
  });

  it('should throw an error if email does not exist', async () => {
    const authToken = await getToken('client_admin');
    const response = await app.inject({
      method: 'POST',
      url: '/email/send-welcome',
      headers: { Cookie: `alenvi_token=${authToken}` },
      payload: { ...payload, email: 'qwertyuiop@asdfghjkl.fr' },
    });

    expect(response.statusCode).toBe(404);
  });

  it('should throw an error if type is not trainer, helper, coach or client_admin', async () => {
    const authToken = await getToken('client_admin');
    const response = await app.inject({
      method: 'POST',
      url: '/email/send-welcome',
      headers: { Cookie: `alenvi_token=${authToken}` },
      payload: { ...payload, type: 'poiuyt' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should not throw an error if type is trainee and vendor user is not from the same company as trainee',
    async () => {
      const authToken = await getToken('vendor_admin');
      const response = await app.inject({
        method: 'POST',
        url: '/email/send-welcome',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { email: emailUserFromOtherCompany.local.email, type: 'trainee' },
      });

      expect(response.statusCode).toBe(200);
    });

  const missingParams = ['type', 'email'];
  missingParams.forEach((param) => {
    it(`should return a 400 error if ${param} param is missing`, async () => {
      const authToken = await getToken('client_admin');
      const response = await app.inject({
        method: 'POST',
        url: '/email/send-welcome',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: omit(payload, [param]),
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
