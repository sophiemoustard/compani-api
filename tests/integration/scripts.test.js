const { expect } = require('expect');
const sinon = require('sinon');
const app = require('../../server');
const { populateDB } = require('./seed/scriptsSeed');
const { getToken } = require('./helpers/authentication');
const EmailHelper = require('../../src/helpers/email');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('SCRIPTS ROUTES - GET /scripts/bill-dispatch', () => {
  let authToken;
  let billAlertEmail;
  describe('VENDOR_ADMIN', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      billAlertEmail = sinon.stub(EmailHelper, 'billAlertEmail');
      authToken = await getToken('vendor_admin');
    });
    afterEach(() => {
      billAlertEmail.restore();
    });
    it('should send email for bills', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/scripts/bill-dispatch?date=2021-08-05',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.results.length).toEqual(1);
    });
  });
});
