const expect = require('expect');
const { customersList, populateCustomers } = require('./seed/customersSeed');
const { thirdPartyPayersList, populateThirdPartyPayers } = require('./seed/thirdPartyPayersSeed');
const { billsList, populateBills } = require('./seed/billsSeed');
const { populateEvents } = require('./seed/eventsSeed');
const { populateUsers, getToken } = require('./seed/usersSeed');
const { populateRoles } = require('./seed/rolesSeed');
const app = require('../../server');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('BALANCES ROUTES', () => {
  let authToken = null;
  before(populateRoles);
  before(populateCustomers);
  before(populateUsers);
  before(populateThirdPartyPayers);
  before(populateEvents);
  before(populateBills);
  beforeEach(async () => {
    authToken = await getToken();
  });

  describe('GET /balances', () => {
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
          _id: { tpp: null, customer: customersList[1]._id },
          customer: expect.objectContaining({
            _id: customersList[1]._id,
            identity: customersList[1].identity,
            payment: expect.objectContaining({
              bankAccountOwner: customersList[1].payment.bankAccountOwner,
              bic: customersList[1].payment.bic,
              iban: customersList[1].payment.iban,
              mandates: expect.arrayContaining([
                expect.objectContaining({
                  _id: customersList[1].payment.mandates[0]._id,
                  rum: customersList[1].payment.mandates[0].rum,
                }),
              ]),
            }),
          }),
          paid: 0,
          billed: billsList[1].netInclTaxes,
          balance: -billsList[1].netInclTaxes,
        }),
        expect.objectContaining({
          _id: { tpp: thirdPartyPayersList[0]._id, customer: customersList[0]._id },
          customer: expect.objectContaining({
            _id: customersList[0]._id,
            identity: customersList[0].identity,
            payment: expect.objectContaining({
              bankAccountOwner: customersList[0].payment.bankAccountOwner,
              bic: customersList[0].payment.bic,
              iban: customersList[0].payment.iban,
              mandates: expect.arrayContaining([
                expect.objectContaining({
                  _id: customersList[0].payment.mandates[0]._id,
                  rum: customersList[0].payment.mandates[0].rum,
                }),
              ]),
            }),
          }),
          thirdPartyPayer: { _id: thirdPartyPayersList[0]._id, name: thirdPartyPayersList[0].name },
          paid: 0,
          billed: billsList[0].netInclTaxes,
          balance: -billsList[0].netInclTaxes,
        }),
      ]));
    });
  });
});
