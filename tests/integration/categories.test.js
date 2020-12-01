const expect = require('expect');
const { ObjectID } = require('mongodb');
const Category = require('../../src/models/Category');
const app = require('../../server');
const {
  populateDB,
  categoriesList,
} = require('./seed/categoriesSeed');
const { getToken } = require('./seed/authenticationSeed');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('CATEGORIES ROUTES - POST /categories', () => {
  let authToken;
  beforeEach(populateDB);

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should create a category', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/categories',
        headers: { 'x-access-token': authToken },
        payload: { name: 'ma nouvelle catégorie' },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 409 if name is already taken', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/categories',
        headers: { 'x-access-token': authToken },
        payload: { name: 'ce nom de catégorie est déja pris!' },
      });

      expect(response.statusCode).toBe(409);
    });

    it('should return 400 if there is no name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/categories',
        headers: { 'x-access-token': authToken },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'training_organisation_manager', expectedCode: 200 },
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'trainer', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'POST',
          url: '/categories',
          headers: { 'x-access-token': authToken },
          payload: { name: `ma nouvelle catégorie en tant que ${role.name}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('CATEGORIES ROUTES - GET /categories', () => {
  let authToken = null;
  beforeEach(populateDB);

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should get all categories', async () => {
      const categoriesNumber = categoriesList.length;
      const response = await app.inject({
        method: 'GET',
        url: '/categories',
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.categories.length).toEqual(categoriesNumber);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'training_organisation_manager', expectedCode: 200 },
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'trainer', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: '/categories',
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('CATEGORY ROUTES - PUT /categories/{_id}', () => {
  let authToken = null;
  beforeEach(populateDB);

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should update category name', async () => {
      const categoryId = categoriesList[0]._id;
      const response = await app.inject({
        method: 'PUT',
        url: `/categories/${categoryId.toHexString()}`,
        headers: { 'x-access-token': authToken },
        payload: { name: 'nouveau nom' },
      });

      const categoryUpdated = await Category.findById(categoryId).lean();

      expect(response.statusCode).toBe(200);
      expect(categoryUpdated.name).toEqual('nouveau nom');
    });

    it('should return 404 if category does not exist', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/categories/${new ObjectID()}`,
        headers: { 'x-access-token': authToken },
        payload: { name: 'nouveau nom' },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 409 if new name is already taken', async () => {
      const categoryId = categoriesList[0]._id;
      const response = await app.inject({
        method: 'PUT',
        url: `/categories/${categoryId.toHexString()}`,
        headers: { 'x-access-token': authToken },
        payload: { name: 'ce nom de catégorie est déja pris!' },
      });

      expect(response.statusCode).toBe(409);
    });

    it('should return 400 if payload has no name', async () => {
      const categoryId = categoriesList[0]._id;
      const response = await app.inject({
        method: 'PUT',
        url: `/categories/${categoryId.toHexString()}`,
        headers: { 'x-access-token': authToken },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'training_organisation_manager', expectedCode: 200 },
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'trainer', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const categoryId = categoriesList[0]._id;
        const response = await app.inject({
          method: 'PUT',
          payload: { name: `mon nouveau nom de catégorie en tant que ${role.name}` },
          url: `/categories/${categoryId.toHexString()}`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('CATEGORY ROUTES - DELETE /categories/{_id}', () => {
  let authToken = null;
  beforeEach(populateDB);

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should delete category', async () => {
      const categoryId = categoriesList[0]._id;
      const categoriesCount = await Category.countDocuments();
      const response = await app.inject({
        method: 'DELETE',
        url: `/categories/${categoryId.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(await Category.countDocuments()).toEqual(categoriesCount - 1);
    });

    it('should return a 403 if category is used', async () => {
      const categoryId = categoriesList[4]._id;
      const response = await app.inject({
        method: 'DELETE',
        url: `/categories/${categoryId.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return a 404 if category does not exist', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/categories/${new ObjectID().toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'training_organisation_manager', expectedCode: 200 },
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'trainer', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const categoryId = categoriesList[0]._id;
        const response = await app.inject({
          method: 'DELETE',
          url: `/categories/${categoryId.toHexString()}`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
