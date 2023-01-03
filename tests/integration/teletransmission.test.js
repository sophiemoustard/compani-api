const { expect } = require('expect');
const app = require('../../server');
const { populateDB, teletransmissionTppList } = require('./seed/teletransmissionSeed');
const { getToken } = require('./helpers/authentication');

describe('TELETRANSMISSION ROUTES - GET /teletransmission/delivery', () => {
  let authToken;
  describe('CLIENT_ADMIN', () => {
    beforeEach(populateDB);

    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should generate xml delivery file', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/teletransmission/delivery?thirdPartyPayers=${teletransmissionTppList[0]._id}&month=09-2021`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should generate xml delivery file only for past events', async () => {
      const tppId = teletransmissionTppList[0]._id;
      const response = await app.inject({
        method: 'GET',
        url: `/teletransmission/delivery?thirdPartyPayers=${tppId}&month=09-2021&onlyPastEvents=true`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return a 404 if tpp is not from the same company', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/teletransmission/delivery?thirdPartyPayers=${teletransmissionTppList[2]._id}&month=09-2021`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 400 if thirdPartyPayers is missing in query', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/teletransmission/delivery?month=09-2021',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 if month is missing in query', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/teletransmission/delivery?thirdPartyPayers=${teletransmissionTppList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 403 if missing teletransmissionId', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/teletransmission/delivery?thirdPartyPayers=${teletransmissionTppList[5]._id}&month=09-2021`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return a 403 if missing companyCode', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/teletransmission/delivery?thirdPartyPayers=${teletransmissionTppList[7]._id}&month=09-2021`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return a 403 if missing teletransmissionType', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/teletransmission/delivery?thirdPartyPayers=${teletransmissionTppList[6]._id}&month=09-2021`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return a 409 if different companyCode', async () => {
      const tpp1 = teletransmissionTppList[0]._id;
      const tpp2 = teletransmissionTppList[3]._id;
      const response = await app.inject({
        method: 'GET',
        url: `/teletransmission/delivery?thirdPartyPayers=${tpp1}&thirdPartyPayers=${tpp2}&month=09-2021`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(409);
    });

    it('should return a 409 if different teletransmissionType', async () => {
      const tpp1 = teletransmissionTppList[0]._id;
      const tpp2 = teletransmissionTppList[4]._id;
      const response = await app.inject({
        method: 'GET',
        url: `/teletransmission/delivery?thirdPartyPayers=${tpp1}&thirdPartyPayers=${tpp2}&month=09-2021`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe('Other roles', () => {
    beforeEach(populateDB);
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        const tpp1 = teletransmissionTppList[0]._id;
        const tpp2 = teletransmissionTppList[1]._id;
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/teletransmission/delivery?thirdPartyPayers=${tpp1}&thirdPartyPayers=${tpp2}&month=09-2021`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
