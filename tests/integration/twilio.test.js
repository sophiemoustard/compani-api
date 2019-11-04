const expect = require('expect');
const sinon = require('sinon');
const twilio = require()
const app = require('../../server');
const { getToken, populateDBForAuthentification } = require('./seed/authentificationSeed');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('TWILIO ROUTES', () => {
  let authToken;
  const payload = {
    to: '+33689763256',
    from: '+33789763256',
    body: 'Ceci est un test',
  };

  beforeEach(populateDBForAuthentification);

  beforeEach(async () => {
    authToken = await getToken('admin');
  });

  it('should send a SMS to user from company', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/sms',
      payload,
      headers: { 'x-access-token': authToken },
    });

    expect(response.statusCode).toBe(200);
    expect(response.result.sms)
  });
});
