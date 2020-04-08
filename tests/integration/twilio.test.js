const expect = require('expect');
const sinon = require('sinon');
const omit = require('lodash/omit');
const app = require('../../server');
const { getToken, populateDBForAuthentication, authCompany } = require('./seed/authenticationSeed');
const { twilioUser, twilioUserFromOtherCompany, populateDB } = require('./seed/twilioSeed');
const TwilioHelper = require('../../src/helpers/twilio');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('TWILIO ROUTES', () => {
  let authToken;
  let TwilioHelperStub;
  beforeEach(populateDBForAuthentication);
  beforeEach(populateDB);

  describe('POST /sms', () => {
    beforeEach(async () => {
      authToken = await getToken('client_admin');
      TwilioHelperStub = sinon.stub(TwilioHelper, 'sendMessage').returns('SMS SENT !');
    });
    afterEach(() => {
      TwilioHelperStub.restore();
    });

    it('should send a SMS to user from company', async () => {
      const payload = { to: `+33${twilioUser.contact.phone.substring(1)}`, body: 'Ceci est un test' };
      const credentials = { company: { _id: authCompany._id } };
      const response = await app.inject({
        method: 'POST',
        url: '/sms',
        payload,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.sms).toBe('SMS SENT !');
      sinon.assert.calledWith(
        TwilioHelperStub,
        payload.to,
        payload.body,
        sinon.match(credentials)
      );
    });

    it('should throw error if phone is not in the same company', async () => {
      const payload = { to: `+33${twilioUserFromOtherCompany.contact.phone.substring(1)}`, body: 'Ceci est un test' };
      const response = await app.inject({
        method: 'POST',
        url: '/sms',
        payload,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should throw error id phone does not exist', async () => {
      const payload = { to: '+33676543243', body: 'Ceci est un test' };
      const response = await app.inject({
        method: 'POST',
        url: '/sms',
        payload,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(404);
    });

    const missingParams = [{ path: 'to' }, { path: 'body' }];
    missingParams.forEach((test) => {
      const payload = { to: `+33${twilioUser.contact.phone}`, body: 'Ceci est un test' };
      it(`should return a 400 error if missing '${test.path}' parameter`, async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/sms',
          payload: omit({ ...payload }, test.path),
          headers: { 'x-access-token': authToken },
        });
        expect(response.statusCode).toBe(400);
      });
    });

    const roles = [
      { name: 'coach', expectedCode: 200 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'helper', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
      { name: 'training_organisation_manager', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      const payload = { to: `+33${twilioUser.contact.phone.substring(1)}`, body: 'Ceci est un test' };
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

  describe('POST /sms/compani', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
      TwilioHelperStub = sinon.stub(TwilioHelper, 'sendCompaniSMS').returns('SMS SENT !');
    });
    afterEach(() => {
      TwilioHelperStub.restore();
    });

    it('should send a SMS to user from compani', async () => {
      const payload = { to: `+33${twilioUser.contact.phone.substring(1)}`, body: 'Ceci est un test' };
      const response = await app.inject({
        method: 'POST',
        url: '/sms/compani',
        payload,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.sms).toBe('SMS SENT !');
      sinon.assert.calledWith(
        TwilioHelperStub,
        payload.to,
        payload.body
      );
    });

    it('should throw error id phone does not exist', async () => {
      const payload = { to: '+33676543243', body: 'Ceci est un test' };
      const response = await app.inject({
        method: 'POST',
        url: '/sms/compani',
        payload,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(404);
    });

    const missingParams = [{ path: 'to' }, { path: 'body' }];
    missingParams.forEach((test) => {
      const payload = { to: `+33${twilioUser.contact.phone}`, body: 'Ceci est un test' };
      it(`should return a 400 error if missing '${test.path}' parameter`, async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/sms/compani',
          payload: omit({ ...payload }, test.path),
          headers: { 'x-access-token': authToken },
        });
        expect(response.statusCode).toBe(400);
      });
    });

    const roles = [
      { name: 'coach', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'helper', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'training_organisation_manager', expectedCode: 200 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        const payload = { to: `+33${twilioUser.contact.phone.substring(1)}`, body: 'Ceci est un test' };
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'POST',
          url: '/sms/compani',
          headers: { 'x-access-token': authToken },
          payload,
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
