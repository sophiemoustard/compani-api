const expect = require('expect');

const app = require('../server');
const { populateRoles } = require('./seed/rolesSeed');
const { populateUsers, getToken } = require('./seed/usersSeed');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('EMAIL ROUTES', () => {
  let token = null;
  beforeEach(populateRoles);
  beforeEach(populateUsers);
  beforeEach(async () => {
    token = await getToken();
  });
  describe('POST /email/sendWelcome', () => {
    it('should send an email to new webapp users', async () => {
      const payload = {
        sender: { email: 'test@alenvi.io' },
        receiver: { email: 't@t.com', password: '123456' }
      };
      const res = await app.inject({
        method: 'POST',
        url: '/email/sendWelcome',
        payload,
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.mailInfo).toEqual(expect.objectContaining({
        accepted: [payload.receiver.email]
      }));
    });
  });

  describe('POST /email/sendAuxiliaryWelcome', () => {
    it('should send an email to new auxiliaries', async () => {
      const payload = { email: 'test@test.com' };
      const res = await app.inject({
        method: 'POST',
        url: '/email/sendAuxiliaryWelcome',
        payload,
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.mailInfo).toEqual(expect.objectContaining({
        accepted: [payload.email]
      }));
    });
  });
});
