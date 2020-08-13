const expect = require('expect');
const {
  populateDB,
  balanceCustomerList,
  balanceThirdPartyPayer,
  balanceBillList,
  balanceUserList,
  customerFromOtherCompany,
} = require('./seed/balanceSeed');
const { getToken, getTokenByCredentials } = require('./seed/authenticationSeed');
const app = require('../../server');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('BALANCES ROUTES - GET /', () => {
  let authToken = null;
  beforeEach(populateDB);

  describe('CLIENT_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should get all clients balances', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/balances',
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.balances).toBeDefined();

      const romainBalance = response.result.data.balances.find(b => b.customer.identity.firstname === 'Romain');
      expect(romainBalance).toMatchObject({
        _id: { tpp: balanceThirdPartyPayer._id, customer: balanceCustomerList[1]._id },
        customer: {
          _id: balanceCustomerList[1]._id,
          identity: balanceCustomerList[1].identity,
          fundings: [],
          payment: {
            bankAccountOwner: balanceCustomerList[1].payment.bankAccountOwner,
            bic: balanceCustomerList[1].payment.bic,
            iban: balanceCustomerList[1].payment.iban,
            mandates: [{
              _id: balanceCustomerList[1].payment.mandates[0]._id,
              rum: balanceCustomerList[1].payment.mandates[0].rum,
              signedAt: new Date('2020-01-23T00:00:00'),
            }],
          },
        },
        thirdPartyPayer: { _id: balanceThirdPartyPayer._id, name: balanceThirdPartyPayer.name },
        paid: 0,
        participationRate: 0,
        toPay: 0,
        billed: balanceBillList[1].netInclTaxes,
        balance: -balanceBillList[1].netInclTaxes,
      });

      const eganBalance = response.result.data.balances.find(b => b.customer.identity.firstname === 'Egan');
      expect(eganBalance).toMatchObject({
        _id: { tpp: null, customer: balanceCustomerList[0]._id },
        customer: {
          _id: balanceCustomerList[0]._id,
          fundings: [],
          identity: balanceCustomerList[0].identity,
          payment: {
            bankAccountOwner: balanceCustomerList[0].payment.bankAccountOwner,
            bic: balanceCustomerList[0].payment.bic,
            iban: balanceCustomerList[0].payment.iban,
            mandates: [{
              _id: balanceCustomerList[0].payment.mandates[0]._id,
              rum: balanceCustomerList[0].payment.mandates[0].rum,
              createdAt: expect.any(Date),
              signedAt: new Date('2020-01-23T00:00:00'),
            }],
          },
        },
        paid: 0,
        participationRate: 100,
        toPay: 101.28,
        billed: balanceBillList[0].netInclTaxes,
        balance: -balanceBillList[0].netInclTaxes,
      });
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'coach', expectedCode: 200 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: '/balances',
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('BALANCES ROUTES - GET /details', () => {
  let authToken = null;
  const helper = balanceUserList[0];
  beforeEach(populateDB);

  describe('CLIENT_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should get all clients balances', async () => {
      const customerId = balanceCustomerList[0]._id;
      const response = await app.inject({
        method: 'GET',
        url: `/balances/details?customer=${customerId}&startDate=2019-10-10&endDate=2019-11-10`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.balances).toBeDefined();
      expect(response.result.data.balances
        .every(b => b.customer._id.toHexString() === customerId.toHexString())).toBeTruthy();
      expect(response.result.data.bills).toBeDefined();
      expect(response.result.data.payments).toBeDefined();
      expect(response.result.data.creditNotes).toBeDefined();
    });

    it('should not get all clients balances is customer si not from the same company', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/balances/details?customer=${customerFromOtherCompany._id}&startDate=2019-10-10&endDate=2019-11-10`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('Other roles', () => {
    it('should return customer balance if I am its helper', async () => {
      const helperToken = await getTokenByCredentials(helper.local);
      const res = await app.inject({
        method: 'GET',
        url: `/balances/details?customer=${helper.customers[0]}&startDate=2019-10-10&endDate=2019-11-10`,
        headers: { 'x-access-token': helperToken },
      });
      expect(res.statusCode).toBe(200);
    });

    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 200 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/balances/details?customer=${helper.customers[0]}&startDate=2019-10-10&endDate=2019-11-10`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
