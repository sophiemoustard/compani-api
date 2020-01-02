const expect = require('expect');
const { populateDB, tppList } = require('./seed/billSlipsSeed');
const { getToken } = require('./seed/authenticationSeed');
const app = require('../../server');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('BILL SLIP ROUTES - GET /', () => {
  let authToken = null;
  beforeEach(populateDB);

  describe('Admin', () => {
    beforeEach(async () => {
      authToken = await getToken('admin');
    });

    it('should return bill slips', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/billslips',
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.billSlips).toEqual(expect.arrayContaining([
        {
          _id: { thirdPartyPayer: tppList[0]._id, year: 2019, month: 11 },
          netInclTaxes: 50,
          month: '11-2019',
          thirdPartyPayer: { _id: tppList[0]._id, name: 'third party payer' },
          number: 'BORD-123456789009',
        },
        {
          _id: { thirdPartyPayer: tppList[1]._id, year: 2019, month: 11 },
          netInclTaxes: 100,
          month: '11-2019',
          thirdPartyPayer: { _id: tppList[1]._id, name: 'tpp' },
          number: 'BORD-123456789001',
        },
        {
          _id: { thirdPartyPayer: tppList[0]._id, year: 2019, month: 12 },
          netInclTaxes: 120,
          month: '12-2019',
          thirdPartyPayer: { _id: tppList[0]._id, name: 'third party payer' },
          number: 'BORD-123456789002',
        },
        {
          _id: { thirdPartyPayer: tppList[1]._id, year: 2019, month: 12 },
          netInclTaxes: 70,
          month: '12-2019',
          thirdPartyPayer: { _id: tppList[1]._id, name: 'tpp' },
          number: 'BORD-123456789004',
        },
      ]));
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: '/billslips',
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
