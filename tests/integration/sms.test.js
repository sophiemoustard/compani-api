const expect = require('expect');
const sinon = require('sinon');
const omit = require('lodash/omit');
const app = require('../../server');
const { getToken, populateDBForAuthentication, authCompany } = require('./seed/authenticationSeed');
const { smsUser, smsUserFromOtherCompany, populateDB } = require('./seed/smsSeed');
const SmsHelper = require('../../src/helpers/sms');

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
      SmsHelperStub = sinon.stub(SmsHelper, 'sendMessage').returns('SMS SENT !');
    });
    afterEach(() => {
      SmsHelperStub.restore();
    });

    it('should send a SMS to user from company', async () => {
      const payload = { to: `+33${smsUser.contact.phone.substring(1)}`, body: 'Ceci est un test' };
      const credentials = { company: { _id: authCompany._id } };
      const response = await app.inject({
        method: 'POST',
        url: '/sms',
        payload,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.sms).toBe('SMS SENT !');
      sinon.assert.calledWithExactly(
        SmsHelperStub,
        payload.to,
        payload.body,
        sinon.match(credentials)
      );
    });

    it('should throw error if phone is not in the same company', async () => {
      const payload = { to: `+33${smsUserFromOtherCompany.contact.phone.substring(1)}`, body: 'Ceci est un test' };
      const response = await app.inject({
        method: 'POST',
        url: '/sms',
        payload,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(403);
      sinon.assert.notCalled(SmsHelperStub);
    });

    it('should throw error if phone does not exist', async () => {
      const payload = { to: '+33676543243', body: 'Ceci est un test' };
      const response = await app.inject({
        method: 'POST',
        url: '/sms',
        payload,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(404);
      sinon.assert.notCalled(SmsHelperStub);
    });

    const missingParams = [{ path: 'to' }, { path: 'body' }];
    missingParams.forEach((test) => {
      const payload = { to: `+33${smsUser.contact.phone}`, body: 'Ceci est un test' };
      it(`should return a 400 error if missing '${test.path}' parameter`, async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/sms',
          payload: omit({ ...payload }, test.path),
          headers: { 'x-access-token': authToken },
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
      const payload = { to: `+33${smsUser.contact.phone.substring(1)}`, body: 'Ceci est un test' };
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'POST',
          url: '/sms',
          headers: { 'x-access-token': authToken },
          payload,
        });
        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
