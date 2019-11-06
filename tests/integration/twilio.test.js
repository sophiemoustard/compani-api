const expect = require('expect');
const sinon = require('sinon');
const omit = require('lodash/omit');
const app = require('../../server');
const { getToken, populateDBForAuthentification } = require('./seed/authenticationSeed');
const TwilioHelper = require('../../src/helpers/twilio');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('TWILIO ROUTES', () => {
  let TwilioHelperStub;
  let authToken;
  const payload = {
    to: '+33689763256',
    from: '+33789763256',
    body: 'Ceci est un test',
  };

  beforeEach(populateDBForAuthentification);

  beforeEach(async () => {
    authToken = await getToken('admin');
    TwilioHelperStub = sinon.stub(TwilioHelper, 'sendMessage').returns('SMS SENT !');
  });

  afterEach(() => {
    TwilioHelperStub.restore();
  });

  it('should send a SMS to user from company', async () => {
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

  const missingParams = [
    { path: 'to' },
    { path: 'from' },
    { path: 'body' },
  ];
  missingParams.forEach((test) => {
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
