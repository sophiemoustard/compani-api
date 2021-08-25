const expect = require('expect');
const sinon = require('sinon');
const omit = require('lodash/omit');
const app = require('../../server');
const { populateDB, emailUser, emailUserFromOtherCompany, trainerFromOtherCompany } = require('./seed/emailSeed');
const { getToken } = require('./helpers/authentication');
const NodemailerHelper = require('../../src/helpers/nodemailer');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('POST emails/send-welcome', () => {
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

  describe('VENDOR_ADMIN', () => {
    let authToken;
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    const receivers = [
      { type: 'client_admin', email: emailUserFromOtherCompany.local.email },
      { type: 'trainer', email: trainerFromOtherCompany.local.email },
      { type: 'trainee', email: emailUserFromOtherCompany.local.email },
    ];
    receivers.forEach((receiver) => {
      it(`should send a welcoming email to a ${receiver.type} from an other company`, async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/email/send-welcome',
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload: receiver,
        });

        expect(response.statusCode).toBe(200);
        expect(response.result.data.mailInfo).toEqual('emailSent');
        sinon.assert.calledWithExactly(sendinBlueTransporter);
      });
    });

    it('should throw an error if email does not exist', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/email/send-welcome',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { ...payload, email: 'qwertyuiop@asdfghjkl.fr' },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should throw an error if type is not trainer, helper, coach, client_admin or trainee', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/email/send-welcome',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { ...payload, type: 'poiuyt' },
      });

      expect(response.statusCode).toBe(400);
    });

    const missingParams = ['type', 'email'];
    missingParams.forEach((param) => {
      it(`should return a 400 error if ${param} param is missing`, async () => {
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

  describe('other roles', () => {
    it('should send a welcoming email as user is coach and receiver is newly registered helper in auth company',
      async () => {
        const authToken = await getToken('coach');
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

    it('should throw an error as sender has client role and receiver is from other company', async () => {
      const authToken = await getToken('client_admin');
      const response = await app.inject({
        method: 'POST',
        url: '/email/send-welcome',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { ...payload, email: emailUserFromOtherCompany.local.email },
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
