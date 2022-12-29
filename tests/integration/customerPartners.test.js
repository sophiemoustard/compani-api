const { expect } = require('expect');
const app = require('../../server');
const CustomerPartner = require('../../src/models/CustomerPartner');
const { authCompany } = require('../seed/authCompaniesSeed');
const { getToken, getTokenByCredentials } = require('./helpers/authentication');
const {
  populateDB,
  customersList,
  partnersList,
  auxiliaryFromOtherCompany,
  customerPartnersList,
} = require('./seed/customerPartnersSeed');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('CUSTOMER PARTNERS ROUTES - POST /customerpartners', () => {
  let authToken;
  beforeEach(populateDB);

  describe('AUXILIARY', () => {
    beforeEach(async () => {
      authToken = await getToken('auxiliary');
    });

    it('should create partner customer', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/customerpartners',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { customer: customersList[0]._id, partner: partnersList[0]._id },
      });

      expect(response.statusCode).toBe(200);
      const createdCustomerParnter = await CustomerPartner
        .countDocuments({ customer: customersList[0]._id, partner: partnersList[0]._id });
      expect(createdCustomerParnter).toEqual(1);
    });

    it('should return 400 if missing customer', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/customerpartners',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { partner: partnersList[0]._id },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if missing partner', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/customerpartners',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { customer: customersList[0]._id },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 if customer has wrong company', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/customerpartners',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { customer: customersList[1]._id, partner: partnersList[0]._id },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 if partner has wrong company', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/customerpartners',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { customer: customersList[0]._id, partner: partnersList[1]._id },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 if user has wrong company', async () => {
      authToken = await getTokenByCredentials(auxiliaryFromOtherCompany.local);
      const response = await app.inject({
        method: 'POST',
        url: '/customerpartners',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { customer: customersList[0]._id, partner: partnersList[0]._id },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 409 if customer partner already exists', async () => {
      authToken = await getTokenByCredentials(auxiliaryFromOtherCompany.local);
      const response = await app.inject({
        method: 'POST',
        url: '/customerpartners',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { customer: customersList[1]._id, partner: partnersList[1]._id },
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'coach', expectedCode: 200 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
      { name: 'helper', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'POST',
          url: '/customerpartners',
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload: { customer: customersList[0]._id, partner: partnersList[0]._id },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('CUSTOMER PARTNERS ROUTES - GET /customerpartners', () => {
  let authToken;
  beforeEach(populateDB);

  describe('AUXILIARY', () => {
    beforeEach(async () => {
      authToken = await getToken('auxiliary');
    });

    it('should get all partners of a user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/customerpartners?customer=${customersList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const customerPartners = await CustomerPartner.countDocuments({ customer: customersList[0]._id });
      expect(customerPartners).toEqual(2);
    });

    it('should return 404 if customer and user have different companies', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/customerpartners?customer=${customersList[1]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'coach', expectedCode: 200 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
      { name: 'helper', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/customerpartners?customer=${customersList[0]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('CUSTOMER PARTNERS ROUTES - PUT /customerpartners/{_id}', () => {
  let authToken;
  beforeEach(populateDB);

  describe('AUXILIARY', () => {
    beforeEach(async () => {
      authToken = await getToken('auxiliary');
    });

    it('should update prescriber of customer partner', async () => {
      const customerPartnerId = customerPartnersList[1]._id;
      const response = await app.inject({
        method: 'PUT',
        url: `/customerpartners/${customerPartnerId}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { prescriber: true },
      });

      expect(response.statusCode).toBe(200);
      const updatedCustomerPartnerList = await CustomerPartner
        .find({ prescriber: true, company: authCompany._id })
        .lean();
      expect(updatedCustomerPartnerList.length).toEqual(1);
      expect(updatedCustomerPartnerList[0]._id).toEqual(customerPartnerId);
    });

    it('should return 404 if customer partner has wrong company', async () => {
      const customerPartnerId = customerPartnersList[0]._id;
      const response = await app.inject({
        method: 'PUT',
        url: `/customerpartners/${customerPartnerId}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { prescriber: true },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'coach', expectedCode: 200 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
      { name: 'helper', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const customerPartnerId = customerPartnersList[1]._id;
        const response = await app.inject({
          method: 'PUT',
          url: `/customerpartners/${customerPartnerId}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload: { prescriber: true },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('CUSTOMER PARTNERS ROUTES - DELETE /customerpartners/{_id}', () => {
  let authToken;
  beforeEach(populateDB);

  describe('AUXILIARY', () => {
    beforeEach(async () => {
      authToken = await getToken('auxiliary');
    });

    it('should remove customer partner', async () => {
      const customerPartnerId = customerPartnersList[1]._id;
      const response = await app.inject({
        method: 'DELETE',
        url: `/customerpartners/${customerPartnerId}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const deletedCustomerPartner = await CustomerPartner.countDocuments({ _id: customerPartnerId });
      expect(deletedCustomerPartner).toEqual(0);
    });

    it('should return 404 if customer partner has wrong company', async () => {
      const customerPartnerId = customerPartnersList[0]._id;
      const response = await app.inject({
        method: 'DELETE',
        url: `/customerpartners/${customerPartnerId}`,
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
        const customerPartnerId = customerPartnersList[1]._id;
        const response = await app.inject({
          method: 'DELETE',
          url: `/customerpartners/${customerPartnerId}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload: { prescriber: true },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
