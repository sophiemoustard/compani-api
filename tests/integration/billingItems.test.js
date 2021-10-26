const sinon = require('sinon');
const expect = require('expect');
const { omit } = require('lodash');
const { ObjectID } = require('mongodb');
const app = require('../../server');
const { getToken } = require('./helpers/authentication');
const { populateDB, billingItemList } = require('./seed/billingItemsSeed');
const BillingItem = require('../../src/models/BillingItem');
const Service = require('../../src/models/Service');
const Bill = require('../../src/models/Bill');
const { authCompany } = require('../seed/authCompaniesSeed');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('BILLING ITEMS ROUTES - POST /billingitems', () => {
  let authToken;
  beforeEach(populateDB);

  describe('CLIENT ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should create a billing item', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/billingitems',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { name: 'Billing Jean', type: 'manual', defaultUnitAmount: 25, vat: 2 },
      });

      expect(response.statusCode).toBe(200);

      const createdBillingItem = await BillingItem.countDocuments({ name: 'Billing Jean', company: authCompany._id });
      expect(createdBillingItem).toBe(1);
    });

    const missingParams = ['name', 'type', 'defaultUnitAmount', 'vat'];
    missingParams.forEach((param) => {
      it(`should return a 400 error if '${param}' is missing in payload`, async () => {
        const payload = omit({ name: 'Billing Elliot', type: 'manual', defaultUnitAmount: 25, vat: 2 }, [param]);

        const response = await app.inject({
          method: 'POST',
          url: '/billingitems',
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload,
        });

        expect(response.statusCode).toBe(400);
      });
    });

    it('should return a 400 if type is invalid', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/billingitems',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { name: 'Billing Murray', type: 'skusku', defaultUnitAmount: 25, vat: 2 },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 409 if a billing item with same name exist for company', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/billingitems',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { name: 'An existing billing', type: 'manual', defaultUnitAmount: 25, vat: 2 },
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'vendor_admin', expectedCode: 403 },
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'POST',
          url: '/billingitems',
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload: { name: 'Billing The Kid', type: 'manual', defaultUnitAmount: 25, vat: 2 },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('BILLING ITEMS ROUTES - GET /billingitems', () => {
  let authToken;
  beforeEach(populateDB);

  describe('COACH', () => {
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    it('should return all company\'s billing items', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/billingitems',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.billingItems).toHaveLength(3);
    });

    it('should return manual billing items', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/billingitems?type=manual',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.billingItems).toHaveLength(1);
    });

    it('should return 400 if type is invalid', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/billingitems?type=skusku',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'vendor_admin', expectedCode: 403 },
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 200 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: '/billingitems',
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('BILLING ITEMS ROUTES - DELETE /billingitems/{_id}', () => {
  let authToken;
  beforeEach(populateDB);

  let countDocuments;
  let billCountDocuments;
  beforeEach(() => {
    countDocuments = sinon.stub(Service, 'countDocuments');
    billCountDocuments = sinon.stub(Bill, 'countDocuments');
  });
  afterEach(() => {
    countDocuments.restore();
    billCountDocuments.restore();
  });

  describe('CLIENT_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should delete a billingItem', async () => {
      const billingItemId = billingItemList[0]._id;

      countDocuments.returns(0);
      billCountDocuments.returns(0);

      const response = await app.inject({
        method: 'DELETE',
        url: `/billingitems/${billingItemId}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      const billingItems = await BillingItem.countDocuments({ company: authCompany._id });
      expect(response.statusCode).toBe(200);
      expect(billingItems).toEqual(2);
      sinon.assert.calledOnceWithExactly(
        countDocuments,
        { company: authCompany._id, 'versions.billingItems': { $eq: billingItemId } }
      );
      sinon.assert.calledOnceWithExactly(
        billCountDocuments,
        { company: authCompany._id, 'billingItemList.billingItem': { $eq: billingItemId } }
      );
    });

    it('should return a 404 if billingItem doesn\'t exist', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/billingitems/${new ObjectID()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
      sinon.assert.notCalled(countDocuments);
      sinon.assert.notCalled(billCountDocuments);
    });

    it('should return a 403 if billingItem is linked to a service', async () => {
      const billingItemId = billingItemList[1]._id;

      countDocuments.returns(1);

      const response = await app.inject({
        method: 'DELETE',
        url: `/billingitems/${billingItemId}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
      sinon.assert.calledOnceWithExactly(
        countDocuments,
        { company: authCompany._id, 'versions.billingItems': { $eq: billingItemId } }
      );
      sinon.assert.notCalled(billCountDocuments);
    });

    it('should return a 403 if billingItem is linked to a bill', async () => {
      const billingItemId = billingItemList[3]._id;
      countDocuments.returns(0);
      billCountDocuments.returns(1);

      const response = await app.inject({
        method: 'DELETE',
        url: `/billingitems/${billingItemId}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
      sinon.assert.calledOnceWithExactly(
        countDocuments,
        { company: authCompany._id, 'versions.billingItems': { $eq: billingItemId } }
      );
      sinon.assert.calledOnceWithExactly(
        billCountDocuments,
        { company: authCompany._id, 'billingItemList.billingItem': { $eq: billingItemId } }
      );
    });
  });
});
