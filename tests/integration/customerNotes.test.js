const expect = require('expect');
const { ObjectID } = require('mongodb');
const app = require('../../server');
const { getToken } = require('./seed/authenticationSeed');
const { customersList, populateDB, customerNotesList } = require('./seed/customerNotesSeed');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('CUSTOMER NOTES ROUTES - POST /customernotes', () => {
  let authToken;
  beforeEach(populateDB);

  describe('AUXILIARY', () => {
    beforeEach(async () => {
      authToken = await getToken('auxiliary');
    });

    it('should create a customer note', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/customernotes',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { title: 'Titre', description: 'description', customer: customersList[0]._id },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 400 if missing customer', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/customernotes',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { title: 'Titre', description: 'description' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if missing title', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/customernotes',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { description: 'description', customer: customersList[0]._id },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if missing description ', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/customernotes',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { title: 'Titre', customer: customersList[0]._id },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if customer has invalid type ', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/customernotes',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { title: 'Titre', description: 'description', customer: '123423' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if title has invalid type ', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/customernotes',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { title: 12342, description: 'description', customer: customersList[0]._id },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if description has invalid type ', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/customernotes',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { title: 'Titre', description: 12345, customer: customersList[0]._id },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 if customer and logged user have different companies', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/customernotes',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { title: 'Titre', description: 'Description', customer: customersList[1]._id },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'coach', expectedCode: 200 },
      { name: 'vendor_admin', expectedCode: 403 },
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'POST',
          url: '/customernotes',
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload: { title: 'Titre', description: 'Description', customer: customersList[0]._id },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('CUSTOMER NOTES ROUTES - GET /customernotes', () => {
  let authToken = null;
  beforeEach(populateDB);

  describe('AUXILIARY', () => {
    beforeEach(async () => {
      authToken = await getToken('auxiliary');
    });

    it('should get all customer notes', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/customernotes?customer=${customersList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 400 if query customer has invalid type', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/customernotes?customer=test',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 if customer and logged user have different companies', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/customernotes?customer=${customersList[1]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'coach', expectedCode: 200 },
      { name: 'vendor_admin', expectedCode: 403 },
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/customernotes?customer=${customersList[0]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('CUSTOMER NOTES ROUTES - PUT /customernotes', () => {
  let authToken;
  beforeEach(populateDB);

  describe('AUXILIARY', () => {
    beforeEach(async () => {
      authToken = await getToken('auxiliary');
    });

    it('should update a customer note', async () => {
      const customerNoteId = customerNotesList[0]._id;
      const response = await app.inject({
        method: 'PUT',
        url: `/customernotes/${customerNoteId}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { title: 'Titre 2', description: 'description 2' },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 400 if params is not an id', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/customernotes/skusku',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { title: 'Titre', description: 'description' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if missing title', async () => {
      const customerNoteId = customerNotesList[0]._id;
      const response = await app.inject({
        method: 'PUT',
        url: `/customernotes/${customerNoteId}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { description: 'description 2' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if missing description', async () => {
      const customerNoteId = customerNotesList[0]._id;
      const response = await app.inject({
        method: 'PUT',
        url: `/customernotes/${customerNoteId}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { title: 'title 2' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if title has invalid type ', async () => {
      const customerNoteId = customerNotesList[0]._id;
      const response = await app.inject({
        method: 'PUT',
        url: `/customernotes/${customerNoteId}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { title: 12342, description: 'description' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if description has invalid type ', async () => {
      const customerNoteId = customerNotesList[0]._id;
      const response = await app.inject({
        method: 'PUT',
        url: `/customernotes/${customerNoteId}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { title: 'Titre', description: 12345 },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 if customer and logged user have different companies', async () => {
      const customerNoteId = customerNotesList[1]._id;
      const response = await app.inject({
        method: 'PUT',
        url: `/customernotes/${customerNoteId}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { title: 'Titre 2', description: 'Description 2' },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'coach', expectedCode: 200 },
      { name: 'vendor_admin', expectedCode: 403 },
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const customerNoteId = customerNotesList[0]._id;
        const response = await app.inject({
          method: 'PUT',
          url: `/customernotes/${customerNoteId}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload: { title: 'Titre 2', description: 'Description 2' },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
