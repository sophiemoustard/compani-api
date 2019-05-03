const expect = require('expect');
const moment = require('moment');
const qs = require('qs');
const omit = require('lodash/omit');

const app = require('../../server');
const { populateUsers, getToken } = require('./seed/usersSeed');
const { populateRoles } = require('./seed/rolesSeed');
const { populateCustomers, customersList } = require('./seed/customersSeed');
const { populateThirdPartyPayers } = require('./seed/thirdPartyPayersSeed');
const { populateEvents } = require('./seed/eventsSeed');
const { populateServices } = require('./seed/servicesSeed');
const { populateCompanies } = require('./seed/companiesSeed');
const { populateBills, billsList } = require('./seed/billsSeed');
const { TWO_WEEKS } = require('../../helpers/constants');
const Bill = require('../../models/Bill');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('BILLS ROUTES', () => {
  let authToken = null;
  before(populateCompanies);
  before(populateRoles);
  before(populateUsers);
  before(populateCustomers);
  before(populateThirdPartyPayers);
  before(populateEvents);
  before(populateServices);
  beforeEach(populateBills);
  beforeEach(async () => {
    authToken = await getToken();
  });

  describe('GET /bills/drafts', () => {
    const query = {
      endDate: moment.utc().endOf('month').toDate(),
      billingStartDate: moment.utc().startOf('month').toDate(),
      billingPeriod: TWO_WEEKS,
    };
    it('should return all draft bills', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/bills/drafts?${qs.stringify(query)}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.draftBills).toEqual(expect.arrayContaining([
        expect.objectContaining({
          customerId: customersList[0]._id,
          customer: expect.objectContaining({
            _id: customersList[0]._id,
            identity: customersList[0].identity,
          }),
          customerBills: expect.objectContaining({
            bills: expect.any(Array),
            total: expect.any(Number),
          }),
        }),
      ]));
    });

    const falsyAssertions = [
      { param: 'endDate', query: { ...omit(query, ['endDate']) } },
      { param: 'billingStartDate', query: { ...omit(query, ['billingStartDate']) } },
      { param: 'billingPeriod', query: { ...omit(query, ['billingPeriod']) } },
    ];
    falsyAssertions.forEach((test) => {
      it(`should return a 400 error if '${test.param}' query is missing`, async () => {
        const response = await app.inject({
          method: 'GET',
          url: `/bills/drafts?${qs.stringify(test.query)}`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(400);
      });
    });
  });

  describe('POST /bills', () => {
    const payload = [
      {
        customerId: '5ccbfcf3d6eaa746a3c34cdf',
        customer: {
          _id: '5ccbfcf3d6eaa746a3c34cdf',
          identity: {
            title: 'a a Directeur',
            firstname: 'Marie',
            lastname: 'Renard',
            birthDate: '2018-05-23T18:59:04.466Z'
          }
        },
        customerBills: {
          bills: [
            {
              _id: '5ccbfcf4bffe7646a387b470',
              subscription: {
                _id: '5ccbfcf3d6eaa746a3c34ce1',
                service: {
                  _id: '5ccbfcf3d6eaa746a3c34cda',
                  type: 'contract_with_customer',
                  company: '5ccbfcf3d6eaa746a3c34cc4',
                  versions: [
                    {
                      _id: '5ccbfcf4bffe7646a387b469',
                      defaultUnitAmount: 12,
                      name: 'Service 1',
                      startDate: '2019-01-16T16:58:15.519Z',
                      vat: 12,
                      createdAt: '2019-05-03T08:33:56.163Z'
                    }
                  ],
                  nature: 'hourly',
                  __v: 0,
                  createdAt: '2019-05-03T08:33:56.163Z',
                  updatedAt: '2019-05-03T08:33:56.163Z'
                },
                versions: [
                  {
                    _id: '5ccbfcf4bffe7646a387b456',
                    unitTTCRate: 12,
                    estimatedWeeklyVolume: 12,
                    evenings: 2,
                    sundays: 1,
                    startDate: '2019-04-03T08:33:55.370Z',
                    createdAt: '2019-05-03T08:33:56.144Z'
                  }
                ],
                createdAt: '2019-05-03T08:33:56.144Z'
              },
              identity: {
                title: 'a a Directeur',
                firstname: 'Marie',
                lastname: 'Renard',
                birthDate: '2018-05-23T18:59:04.466Z'
              },
              discount: 0,
              startDate: '2019-05-01T00:00:00.000Z',
              endDate: '2019-05-31T23:59:59.999Z',
              unitExclTaxes: 10.714285714285714,
              vat: 12,
              eventsList: [
                {
                  event: '5ccbfcf3d6eaa746a3c34ceb',
                  inclTaxesCustomer: 24,
                  exclTaxesCustomer: 21.428571428571427
                }
              ],
              hours: 2,
              exclTaxes: 21.428571428571427,
              inclTaxes: 24
            }
          ],
          total: 24
        },
        thirdPartyPayerBills: [
          {
            bills: [
              {
                _id: '5ccbfcf4bffe7646a387b472',
                subscription: {
                  _id: '5ccbfcf3d6eaa746a3c34cde',
                  service: {
                    _id: '5ccbfcf3d6eaa746a3c34cda',
                    type: 'contract_with_customer',
                    company: '5ccbfcf3d6eaa746a3c34cc4',
                    versions: [
                      {
                        _id: '5ccbfcf4bffe7646a387b469',
                        defaultUnitAmount: 12,
                        name: 'Service 1',
                        startDate: '2019-01-16T16:58:15.519Z',
                        vat: 12,
                        createdAt: '2019-05-03T08:33:56.163Z'
                      }
                    ],
                    nature: 'hourly',
                    __v: 0,
                    createdAt: '2019-05-03T08:33:56.163Z',
                    updatedAt: '2019-05-03T08:33:56.163Z'
                  },
                  versions: [
                    {
                      _id: '5ccbfcf4bffe7646a387b458',
                      unitTTCRate: 12,
                      estimatedWeeklyVolume: 12,
                      evenings: 2,
                      sundays: 1,
                      startDate: '2019-04-03T08:33:55.370Z',
                      createdAt: '2019-05-03T08:33:56.144Z'
                    }
                  ],
                  createdAt: '2019-05-03T08:33:56.144Z'
                },
                identity: {
                  title: 'a a Directeur',
                  firstname: 'Marie',
                  lastname: 'Renard',
                  birthDate: '2018-05-23T18:59:04.466Z'
                },
                discount: 0,
                startDate: '2019-05-01T00:00:00.000Z',
                endDate: '2019-05-31T23:59:59.999Z',
                unitExclTaxes: 10.714285714285714,
                vat: 12,
                exclTaxes: 21.428571428571427,
                inclTaxes: 24,
                hours: 2,
                eventsList: [
                  {
                    event: '5ccbfcf3d6eaa746a3c34cea',
                    inclTaxesTpp: 24,
                    exclTaxesTpp: 21.428571428571427,
                    thirdPartyPayer: '5ccbfcf3d6eaa746a3c34cdc',
                    inclTaxesCustomer: 0,
                    exclTaxesCustomer: 0,
                    history: {
                      amountTTC: 24,
                      fundingVersion: '5ccbfcf4bffe7646a387b45a',
                      nature: 'fixed'
                    },
                    fundingVersion: '5ccbfcf4bffe7646a387b45a',
                    nature: 'fixed'
                  }
                ],
                externalBilling: false,
                thirdPartyPayer: {
                  _id: '5ccbfcf3d6eaa746a3c34cdc',
                  name: 'Toto',
                  __v: 0,
                  createdAt: '2019-05-03T08:33:56.156Z',
                  updatedAt: '2019-05-03T08:33:56.156Z'
                }
              }
            ],
            total: 24
          }
        ]
      }
    ];
    it('should create new bills', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/bills',
        payload: { bills: payload },
        headers: { 'x-access-token': authToken }
      });

      expect(response.statusCode).toBe(200);
      const bills = await Bill.find().lean();
      const draftBillsLength = payload[0].customerBills.bills.length + payload[0].thirdPartyPayerBills[0].bills.length;
      expect(bills.length).toBe(draftBillsLength + 2);
    });
  });

  describe('GET /bills', () => {
    it('should get all bills', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/bills',
        headers: { 'x-access-token': authToken }
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.bills.length).toBe(billsList.length);
    });
  });
});
