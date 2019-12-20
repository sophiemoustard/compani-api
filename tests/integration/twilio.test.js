const expect = require('expect');
const sinon = require('sinon');
const omit = require('lodash/omit');
const app = require('../../server');
const { getToken, populateDBForAuthentication } = require('./seed/authenticationSeed');
const { twilioUser, twilioUserFromOtherCompany, populateDB } = require('./seed/twilioSeed');
const TwilioHelper = require('../../src/helpers/twilio');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('TWILIO ROUTES', () => {
  let TwilioHelperStub;
  let authToken;
  beforeEach(populateDBForAuthentication);
  beforeEach(populateDB);
  beforeEach(async () => {
    authToken = await getToken('admin');
    TwilioHelperStub = sinon.stub(TwilioHelper, 'sendMessage').returns('SMS SENT !');
  });
  afterEach(() => {
    TwilioHelperStub.restore();
  });

  it('should send a SMS to user from company', async () => {
    const payload = {
      to: `+33${twilioUser.contact.phone.substring(1)}`,
      from: '+33789763256',
      body: 'Ceci est un test',
    };
    const response = await app.inject({
      method: 'POST',
      url: '/sms',
      payload,
      headers: { 'x-access-token': authToken },
    });

    expect(response.statusCode).toBe(200);
    expect(response.result.data.sms).toBe('SMS SENT !');
    sinon.assert.calledWithExactly(TwilioHelperStub, payload.to, payload.from, payload.body);
  });

  it('should throw error id phone is not in the same company', async () => {
    const payload = {
      to: `+33${twilioUserFromOtherCompany.contact.phone.substring(1)}`,
      from: '+33789763256',
      body: 'Ceci est un test',
    };
    const response = await app.inject({
      method: 'POST',
      url: '/sms',
      payload,
      headers: { 'x-access-token': authToken },
    });

    expect(response.statusCode).toBe(403);
  });

  it('should throw error id phone does not exist', async () => {
    const payload = {
      to: '+33676543243',
      from: '+33789763256',
      body: 'Ceci est un test',
    };
    const response = await app.inject({
      method: 'POST',
      url: '/sms',
      payload,
      headers: { 'x-access-token': authToken },
    });

    expect(response.statusCode).toBe(404);
  });

  const missingParams = [
    { path: 'to' },
    { path: 'from' },
    { path: 'body' },
  ];
  missingParams.forEach((test) => {
    const payload = {
      to: `+33${twilioUser.contact.phone}`,
      from: '+33789763256',
      body: 'Ceci est un test',
    };
    it(`should return a 400 error if missing '${test.path}' parameter`, async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/contracts',
        payload: omit({ ...payload }, test.path),
        headers: { 'x-access-token': authToken },
      });
      expect(response.statusCode).toBe(400);
    });
  });
});
