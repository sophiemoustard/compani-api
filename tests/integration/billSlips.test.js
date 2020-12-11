const expect = require('expect');
const { ObjectID } = require('mongodb');
const { populateDB, tppList, billSlipList, billSlipFromAnotherCompany } = require('./seed/billSlipsSeed');
const { getToken } = require('./seed/authenticationSeed');
const app = require('../../server');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('BILL SLIP ROUTES - GET /', () => {
  let authToken = null;
  beforeEach(populateDB);

  describe('CLIENT_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should return bill slips', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/billslips',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.billSlips).toEqual(expect.arrayContaining([
        {
          _id: billSlipList[0]._id,
          netInclTaxes: 50,
          month: '11-2019',
          thirdPartyPayer: { _id: tppList[0]._id, name: 'third party payer' },
          number: 'BORD-123456789009',
        },
        {
          _id: billSlipList[1]._id,
          netInclTaxes: 90,
          month: '11-2019',
          thirdPartyPayer: { _id: tppList[1]._id, name: 'tpp' },
          number: 'BORD-123456789001',
        },
        {
          _id: billSlipList[2]._id,
          netInclTaxes: 120,
          month: '12-2019',
          thirdPartyPayer: { _id: tppList[0]._id, name: 'third party payer' },
          number: 'BORD-123456789002',
        },
        {
          _id: billSlipList[3]._id,
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
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: '/billslips',
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('BILL SLIP ROUTES - GET /:_id/docx', () => {
  let authToken = null;
  beforeEach(populateDB);

  describe('CLIENT_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should return bill slips', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/billslips/${billSlipList[0]._id}/docx`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return a 403 error if user is not from same company', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/billslips/${billSlipFromAnotherCompany._id}/docx`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return a 404 error if bill slip does not exist', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/billslips/${new ObjectID()}/docx`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/billslips/${billSlipList[0]._id}/docx`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
