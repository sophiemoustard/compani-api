const expect = require('expect');
const sinon = require('sinon');
const omit = require('lodash/omit');
const app = require('../../server');
const { getToken, populateDBForAuthentication, authCompany } = require('./seed/authenticationSeed');
const { smsUser, smsUserFromOtherCompany, populateDB } = require('./seed/smsSeed');
const SmsHelper = require('../../src/helpers/sms');
const { COURSE_SMS, HR_SMS } = require('../../src/helpers/constants');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('SMS ROUTES', () => {
  let authToken;
  let SmsHelperStub;
  beforeEach(populateDBForAuthentication);
  beforeEach(populateDB);

  describe('POST /sms', () => {
    beforeEach(async () => {
      authToken = await getToken('client_admin');
      SmsHelperStub = sinon.stub(SmsHelper, 'sendFromCompany').returns('SMS SENT !');
    });
    afterEach(() => {
      SmsHelperStub.restore();
    });

    it('should send a SMS to user from company', async () => {
      const payload = { recipient: `+33${smsUser.contact.phone.substring(1)}`, content: 'Test', tag: HR_SMS };
      const response = await app.inject({
        method: 'POST',
        url: '/sms',
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.sms).toBe('SMS SENT !');
      sinon.assert.calledWithExactly(SmsHelperStub, payload, sinon.match({ company: { _id: authCompany._id } }));
    });

    it('should throw error if phone is not in the same company', async () => {
      const payload = {
        recipient: `+33${smsUserFromOtherCompany.contact.phone.substring(1)}`,
        content: 'Ceci est un test',
        tag: COURSE_SMS,
      };
      const response = await app.inject({
        method: 'POST',
        url: '/sms',
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
      sinon.assert.notCalled(SmsHelperStub);
    });

    it('should throw error if phone does not exist', async () => {
      const payload = { recipient: '+33676543243', content: 'Ceci est un test', tag: HR_SMS };
      const response = await app.inject({
        method: 'POST',
        url: '/sms',
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
      sinon.assert.notCalled(SmsHelperStub);
    });

    const missingParams = ['recipient', 'content', 'tag'];
    missingParams.forEach((path) => {
      const payload = { recipient: `+33${smsUser.contact.phone}`, content: 'Ceci est un test', tag: COURSE_SMS };
      it(`should return a 400 error if missing '${path}' parameter`, async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/sms',
          payload: omit({ ...payload }, path),
          headers: { Cookie: `alenvi_token=${authToken}` },
        });
        expect(response.statusCode).toBe(400);
        sinon.assert.notCalled(SmsHelperStub);
      });
    });

    const roles = [
      { name: 'coach', expectedCode: 200 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'helper', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      const payload = { recipient: `+33${smsUser.contact.phone.substring(1)}`, content: 'Test', tag: COURSE_SMS };
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'POST',
          url: '/sms',
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload,
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
