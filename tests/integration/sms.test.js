const { expect } = require('expect');
const sinon = require('sinon');
const omit = require('lodash/omit');
const app = require('../../server');
const { getToken } = require('./helpers/authentication');
const { authCompany } = require('../seed/authCompaniesSeed');
const { smsUser, smsUserFromOtherCompany, populateDB } = require('./seed/smsSeed');
const SmsHelper = require('../../src/helpers/sms');
const { COURSE_SMS, HR_SMS } = require('../../src/helpers/constants');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('SMS ROUTES - POST /sms', () => {
  let authToken;
  let SmsHelperStub;
  describe('COACH', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('coach');
      SmsHelperStub = sinon.stub(SmsHelper, 'sendFromCompany').returns('SMS SENT !');
    });
    afterEach(() => {
      SmsHelperStub.restore();
    });

    it('should send a SMS if phone in the company', async () => {
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

    it('should throw error if no phone in the company', async () => {
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

      expect(response.statusCode).toBe(404);
      sinon.assert.notCalled(SmsHelperStub);
    });

    it('should return a 400 error if tag is invalid', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/sms',
        payload: { recipient: `+33${smsUser.contact.phone.substring(1)}`, content: 'Test', tag: 'test' },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });
      expect(response.statusCode).toBe(400);
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

    describe('Other roles', () => {
      const roles = [
        { name: 'planning_referent', expectedCode: 403 },
        { name: 'helper', expectedCode: 403 },
        { name: 'vendor_admin', expectedCode: 403 },
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
});
