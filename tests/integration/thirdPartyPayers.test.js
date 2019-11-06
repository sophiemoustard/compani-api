const expect = require('expect');
const { ObjectID } = require('mongodb');
const { thirdPartyPayersList, populateDB, tppCompany } = require('./seed/thirdPartyPayersSeed');
const ThirdPartyPayer = require('../../src/models/ThirdPartyPayer');
const app = require('../../server');
const { getToken } = require('./seed/authenticationSeed');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('THIRD PARTY PAYERS ROUTES', () => {
  let authToken = null;
  beforeEach(populateDB);
  beforeEach(async () => {
    authToken = await getToken('admin');
  });

  describe('POST /thirdpartypayers', () => {
    const payload = {
      name: 'Test',
      address: {
        fullAddress: '37 rue de Ponthieu 75008 Paris',
        street: '37 rue de Ponthieu',
        zipCode: '75008',
        city: 'Paris',
      },
      email: 'test@test.com',
      unitTTCRate: 75,
      billingMode: 'direct',
      company: tppCompany._id,
    };

    it('should create a new third party payer', async () => {
      const initialThirdPartyPayerNumber = thirdPartyPayersList.length;

      const response = await app.inject({
        method: 'POST',
        url: '/thirdpartypayers',
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.thirdPartyPayer).toMatchObject(payload);
      const thirdPartyPayers = await ThirdPartyPayer.find().lean();
      expect(thirdPartyPayers.length).toBe(initialThirdPartyPayerNumber + 1);
    });
    const missingParams = [
      {
        paramName: 'name',
        payload: { ...payload },
        update() {
          delete this.payload[this.paramName];
        },
      },
      {
        paramName: 'company',
        payload: { ...payload },
        update() {
          delete this.payload[this.paramName];
        },
      },
    ];
    missingParams.forEach((test) => {
      it(`should return a 400 error if '${test.paramName}' params is missing`, async () => {
        test.update();
        const response = await app.inject({
          method: 'POST',
          url: '/thirdpartypayers',
          headers: { 'x-access-token': authToken },
          payload: test.payload,
        });

        expect(response.statusCode).toBe(400);
      });
    });

    it('should return a 403 error if user does not have right', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/thirdpartypayers',
        headers: { 'x-access-token': authToken },
        payload,
        credentials: { scope: ['Test'] },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('GET /thirdpartypayers', () => {
    it('should get company third party payers', async () => {
      const thirdPartyPayerNumber = thirdPartyPayersList.length;

      const response = await app.inject({
        method: 'GET',
        url: '/thirdpartypayers',
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.thirdPartyPayers.length).toEqual(thirdPartyPayerNumber);
    });

    it('should return a 403 error if user does not have right', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/thirdpartypayers',
        headers: { 'x-access-token': authToken },
        credentials: { scope: ['Test'] },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('PUT /thirdpartypayers/:id', () => {
    const payload = {
      name: 'SuperTest',
      address: {
        fullAddress: '4 rue du test 92160 Antony',
        street: '4 rue du test',
        zipCode: '92160',
        city: 'Antony',
      },
      email: 't@t.com',
      unitTTCRate: 89,
      billingMode: 'indirect',
    };
    it('should update a third party payer', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/thirdpartypayers/${thirdPartyPayersList[0]._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.thirdPartyPayer).toMatchObject(payload);
    });
    it('should return a 404 error if third party payer does not exist', async () => {
      const falsyPayload = {
        name: 'SuperTest',
        address: {
          fullAddress: '4 rue du test 92160 Antony',
          street: '4 rue du test',
          zipCode: '92160',
          city: 'Antony',
        },
        email: 't@t.com',
        unitTTCRate: 89,
        billingMode: 'indirect',
      };
      const response = await app.inject({
        method: 'PUT',
        url: `/thirdpartypayers/${new ObjectID().toHexString()}`,
        headers: { 'x-access-token': authToken },
        payload: falsyPayload,
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 403 error if user does not have right', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/thirdpartypayers/${thirdPartyPayersList[0]._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
        payload,
        credentials: { scope: ['Test'] },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('DELETE /thirdpartypayers/:id', () => {
    it('should delete company thirdPartyPayer', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/thirdpartypayers/${thirdPartyPayersList[0]._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });
      expect(response.statusCode).toBe(200);
      const thirdPartyPayers = await ThirdPartyPayer.find().lean();
      expect(thirdPartyPayers.length).toBe(thirdPartyPayersList.length - 1);
    });

    it('should return a 404 error if company does not exist', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/thirdpartypayers/${new ObjectID().toHexString()}`,
        headers: { 'x-access-token': authToken },
      });
      expect(response.statusCode).toBe(404);
    });

    it('should return a 403 error if user does not have right', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/thirdpartypayers/${thirdPartyPayersList[0]._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
        credentials: { scope: ['Test'] },
      });

      expect(response.statusCode).toBe(403);
    });
  });
});
