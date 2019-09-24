const expect = require('expect');
const { populateDB, balanceCustomerList, balanceThirdPartyPayer, balanceBillList, balanceUserList } = require('./seed/balanceSeed');
const { getToken, getTokenByCredentials } = require('./seed/authentificationSeed');
const app = require('../../server');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('BALANCES ROUTES - GET /balances', () => {
  let authToken = null;
  beforeEach(populateDB);

  describe('Admin', () => {
    beforeEach(async () => {
      authToken = await getToken('admin');
    });

    it('should get all clients balances', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/balances',
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.balances).toBeDefined();
      expect(response.result.data.balances).toEqual(expect.arrayContaining([
        expect.objectContaining({
          _id: { tpp: balanceThirdPartyPayer._id, customer: balanceCustomerList[1]._id },
          customer: expect.objectContaining({
            _id: balanceCustomerList[1]._id,
            identity: balanceCustomerList[1].identity,
            payment: expect.objectContaining({
              bankAccountOwner: balanceCustomerList[1].payment.bankAccountOwner,
              bic: balanceCustomerList[1].payment.bic,
              iban: balanceCustomerList[1].payment.iban,
              mandates: expect.arrayContaining([
                expect.objectContaining({
                  _id: balanceCustomerList[1].payment.mandates[0]._id,
                  rum: balanceCustomerList[1].payment.mandates[0].rum,
                }),
              ]),
            }),
          }),
          thirdPartyPayer: { _id: balanceThirdPartyPayer._id, name: balanceThirdPartyPayer.name },
          paid: 0,
          billed: balanceBillList[1].netInclTaxes,
          balance: -balanceBillList[1].netInclTaxes,
        }),
        expect.objectContaining({
          _id: { tpp: null, customer: balanceCustomerList[0]._id },
          customer: expect.objectContaining({
            _id: balanceCustomerList[0]._id,
            identity: balanceCustomerList[0].identity,
            payment: expect.objectContaining({
              bankAccountOwner: balanceCustomerList[0].payment.bankAccountOwner,
              bic: balanceCustomerList[0].payment.bic,
              iban: balanceCustomerList[0].payment.iban,
              mandates: expect.arrayContaining([
                expect.objectContaining({
                  _id: balanceCustomerList[0].payment.mandates[0]._id,
                  rum: balanceCustomerList[0].payment.mandates[0].rum,
                }),
              ]),
            }),
          }),
          paid: 0,
          billed: balanceBillList[0].netInclTaxes,
          balance: -balanceBillList[0].netInclTaxes,
        }),
      ]));
    });
  });

  describe('Other roles', () => {
    it('should return customer balance if I am its helper', async () => {
      const helper = balanceUserList[0];
      const helperToken = await getTokenByCredentials(helper.local);
      const res = await app.inject({
        method: 'GET',
        url: `/balances?customer=${helper.customers[0]}`,
        headers: { 'x-access-token': helperToken },
      });
      expect(res.statusCode).toBe(200);
    });

    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'coach', expectedCode: 200 },
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
