const expect = require('expect');

const app = require('../server');
const { getToken } = require('./seed/usersSeed');
const { fileToBase64 } = require('../helpers/fileToBase64');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('ESIGN ROUTES', () => {
  let authToken = null;
  beforeEach(async () => {
    authToken = await getToken();
  });

  describe('POST /esign/customers', () => {
    it('should create a customer signature request', async () => {
      const payload = {
        type: 'sepa',
        fileId: process.env.ESIGN_TEST_DOC_DRIVEID,
        customer: {
          name: 'Test',
          email: 'test@test.com'
        },
        fields: {
          title: 'Mme',
          firstname: 'Test',
          lastname: 'Test',
          address: '15 rue du test',
          city: 'Test city',
          zipCode: '34000',
          birthDate: '15/07/88',
          birthCountry: 'France',
          birthState: '93',
          nationality: 'Française',
          SSN: '12345678909876543',
          grossHourlyRate: 24,
          monthlyHours: 56,
          salary: 1500,
          startDate: '18/12/2018',
          weeklyHours: 35,
          yearlyHours: 1200,
          uploadDate: '18/12/2018',
          initialContractStartDate: '16/12/2018'
        }
      };
      const res = await app.inject({
        method: 'POST',
        url: '/esign/customers',
        payload,
        headers: { 'x-access-token': authToken }
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.signatureRequest).toEqual(expect.objectContaining({
        docId: expect.any(String),
        embeddedUrl: expect.any(String)
      }));
    });

    it("should return a 400 error if type is not 'devis' or 'sepa' ", async () => {
      const file64 = await fileToBase64('tests/assets/test_esign.pdf');
      const payload = {
        type: 'toto',
        file: file64,
        customer: {
          name: 'Test',
          email: 'test@test.com'
        }
      };
      const res = await app.inject({
        method: 'POST',
        url: '/esign/customers',
        payload,
        headers: { 'x-access-token': authToken }
      });
      expect(res.statusCode).toBe(400);
    });

    it('should return a 400 error if no customer info is provided', async () => {
      const file64 = await fileToBase64('tests/assets/test_esign.pdf');
      const payload = {
        type: 'sepa',
        file: file64
      };
      const res = await app.inject({
        method: 'POST',
        url: '/esign/customers',
        payload,
        headers: { 'x-access-token': authToken }
      });
      expect(res.statusCode).toBe(400);
    });

    it('should return a 400 error if no file is provided', async () => {
      const payload = {
        type: 'devis',
        customer: {
          name: 'Test',
          email: 'test@test.com'
        }
      };
      const res = await app.inject({
        method: 'POST',
        url: '/esign/customers',
        payload,
        headers: { 'x-access-token': authToken }
      });
      expect(res.statusCode).toBe(400);
    });
  });
});
