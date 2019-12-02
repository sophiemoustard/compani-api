const expect = require('expect');
const moment = require('moment');
const qs = require('qs');
const omit = require('lodash/omit');
const { ObjectID } = require('mongodb');

const app = require('../../server');
const { populateDB, billUserList, billsList, billCustomerList } = require('./seed/billsSeed');
const { TWO_WEEKS } = require('../../src/helpers/constants');
const { getToken, getTokenByCredentials, authCompany } = require('./seed/authenticationSeed');
const Bill = require('../../src/models/Bill');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('BILL ROUTES - GET /bills/drafts', () => {
  let authToken = null;
  beforeEach(populateDB);
  const query = {
    endDate: moment.utc().endOf('month').toDate(),
    billingStartDate: moment.utc().startOf('month').toDate(),
    billingPeriod: TWO_WEEKS,
  };

  describe('Admin', () => {
    beforeEach(async () => {
      authToken = await getToken('admin');
    });

    it('should return all draft bills', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/bills/drafts?${qs.stringify(query)}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.draftBills).toEqual(expect.arrayContaining([
        expect.objectContaining({
          customerId: billCustomerList[0]._id,
          customer: expect.objectContaining({
            _id: billCustomerList[0]._id,
            identity: billCustomerList[0].identity,
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

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/bills/drafts?${qs.stringify(query)}`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('BILL ROUTES - POST /bills', () => {
  let authToken = null;
  beforeEach(populateDB);
  const payload = [
    {
      customerId: '5ccbfcf3d6eaa746a3c34cdf',
      customer: {
        _id: '5ccbfcf3d6eaa746a3c34cdf',
        identity: {
          title: 'mr',
          firstname: 'Marie',
          lastname: 'Renard',
          birthDate: '2018-05-23T18:59:04.466Z',
        },
      },
      endDate: '2019-05-31T23:59:59.999Z',
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
                    createdAt: '2019-05-03T08:33:56.163Z',
                  },
                ],
                nature: 'hourly',
                __v: 0,
                createdAt: '2019-05-03T08:33:56.163Z',
                updatedAt: '2019-05-03T08:33:56.163Z',
              },
              versions: [
                {
                  _id: '5ccbfcf4bffe7646a387b456',
                  unitTTCRate: 12,
                  estimatedWeeklyVolume: 12,
                  evenings: 2,
                  sundays: 1,
                  startDate: '2019-04-03T08:33:55.370Z',
                  createdAt: '2019-05-03T08:33:56.144Z',
                },
              ],
              createdAt: '2019-05-03T08:33:56.144Z',
            },
            identity: {
              title: 'mr',
              firstname: 'Marie',
              lastname: 'Renard',
              birthDate: '2018-05-23T18:59:04.466Z',
            },
            discount: 0,
            startDate: '2019-05-01T00:00:00.000Z',
            endDate: '2019-05-31T23:59:59.999Z',
            unitExclTaxes: 10.714285714285714,
            unitInclTaxes: 12,
            vat: 12,
            eventsList: [
              {
                event: '5ccbfcf3d6eaa746a3c34ceb',
                auxiliary: new ObjectID(),
                startDate: '2019-05-02T08:00:00.000Z',
                endDate: '2019-05-02T10:00:00.000Z',
                inclTaxesCustomer: 24,
                exclTaxesCustomer: 21.428571428571427,
                surcharges: [{ percentage: 90, name: 'Noël' }],
              },
            ],
            hours: 2,
            exclTaxes: 21.428571428571427,
            inclTaxes: 24,
          },
        ],
        total: 24,
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
                      createdAt: '2019-05-03T08:33:56.163Z',
                    },
                  ],
                  nature: 'hourly',
                  __v: 0,
                  createdAt: '2019-05-03T08:33:56.163Z',
                  updatedAt: '2019-05-03T08:33:56.163Z',
                },
                versions: [
                  {
                    _id: '5ccbfcf4bffe7646a387b458',
                    unitTTCRate: 12,
                    estimatedWeeklyVolume: 12,
                    evenings: 2,
                    sundays: 1,
                    startDate: '2019-04-03T08:33:55.370Z',
                    createdAt: '2019-05-03T08:33:56.144Z',
                  },
                ],
                createdAt: '2019-05-03T08:33:56.144Z',
              },
              identity: {
                title: 'mr',
                firstname: 'Marie',
                lastname: 'Renard',
                birthDate: '2018-05-23T18:59:04.466Z',
              },
              discount: 0,
              startDate: '2019-05-01T00:00:00.000Z',
              endDate: '2019-05-31T23:59:59.999Z',
              unitExclTaxes: 10.714285714285714,
              unitInclTaxes: 12,
              vat: 12,
              exclTaxes: 21.428571428571427,
              inclTaxes: 24,
              hours: 2,
              eventsList: [
                {
                  event: '5ccbfcf3d6eaa746a3c34cea',
                  auxiliary: new ObjectID(),
                  startDate: '2019-05-02T08:00:00.000Z',
                  endDate: '2019-05-02T10:00:00.000Z',
                  inclTaxesTpp: 24,
                  exclTaxesTpp: 21.428571428571427,
                  thirdPartyPayer: '5ccbfcf3d6eaa746a3c34cdc',
                  inclTaxesCustomer: 0,
                  exclTaxesCustomer: 0,
                  history: {
                    amountTTC: 24,
                    fundingId: '5ccbfcf4bffe7646a387b45a',
                    nature: 'fixed',
                  },
                  fundingId: '5ccbfcf4bffe7646a387b45a',
                  nature: 'fixed',
                },
              ],
              externalBilling: false,
              thirdPartyPayer: {
                _id: '5ccbfcf3d6eaa746a3c34cdc',
                name: 'Toto',
                company: authCompany._id,
                __v: 0,
                createdAt: '2019-05-03T08:33:56.156Z',
                updatedAt: '2019-05-03T08:33:56.156Z',
              },
            },
          ],
          total: 24,
        },
      ],
    },
  ];

  describe('Admin', () => {
    beforeEach(async () => {
      authToken = await getToken('admin');
    });

    it('should create new bills', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/bills',
        payload: { bills: payload },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      const bills = await Bill.find().lean();
      const draftBillsLength = payload[0].customerBills.bills.length + payload[0].thirdPartyPayerBills[0].bills.length;
      expect(bills.length).toBe(draftBillsLength + billsList.length);
    });

    it('should create new bill with vat 0 if service is not taxed', async () => {
      const draftBillPayload = [
        {
          customerId: '5ccbfcf3d6eaa746a3c34cdf',
          customer: {
            _id: '5ccbfcf3d6eaa746a3c34cdf',
            identity: {
              title: 'mr',
              firstname: 'Marie',
              lastname: 'Renard',
            },
          },
          endDate: '2019-05-31T23:59:59.999Z',
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
                        defaultUnitAmount: 6,
                        name: 'Service 1',
                        startDate: '2019-01-16T16:58:15.519Z',
                        createdAt: '2019-05-03T08:33:56.163Z',
                      },
                    ],
                    nature: 'hourly',
                    createdAt: '2019-05-03T08:33:56.163Z',
                    updatedAt: '2019-05-03T08:33:56.163Z',
                  },
                  versions: [
                    {
                      _id: '5ccbfcf4bffe7646a387b456',
                      unitTTCRate: 6,
                      estimatedWeeklyVolume: 8,
                      evenings: 0,
                      sundays: 0,
                      startDate: '2019-04-03T08:33:55.370Z',
                      createdAt: '2019-05-03T08:33:56.144Z',
                    },
                  ],
                  createdAt: '2019-05-03T08:33:56.144Z',
                },
                identity: {
                  title: 'mr',
                  firstname: 'Marie',
                  lastname: 'Renard',
                  birthDate: '2018-05-23T18:59:04.466Z',
                },
                discount: 0,
                startDate: '2019-05-01T00:00:00.000Z',
                endDate: '2019-05-31T23:59:59.999Z',
                unitExclTaxes: 10.714285714285714,
                unitInclTaxes: 12,
                vat: 12,
                eventsList: [
                  {
                    event: '5ccbfcf3d6eaa746a3c34ceb',
                    auxiliary: new ObjectID(),
                    startDate: '2019-05-02T08:00:00.000Z',
                    endDate: '2019-05-02T10:00:00.000Z',
                    inclTaxesCustomer: 24,
                    exclTaxesCustomer: 21.428571428571427,
                    surcharges: [{ percentage: 90, name: 'Noël' }],
                  },
                ],
                hours: 2,
                exclTaxes: 21.428571428571427,
                inclTaxes: 24,
              },
            ],
            total: 24,
          },
        },
      ];
      const response = await app.inject({
        method: 'POST',
        url: '/bills',
        payload: { bills: draftBillPayload },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      const bills = await Bill.find({ 'subscriptions.vat': 0 }).lean();
      expect(bills.length).toBe(1);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'POST',
          url: '/bills',
          payload: { bills: payload },
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('BILL ROUTES - GET /bills/pdfs', () => {
  let authToken = null;
  beforeEach(populateDB);

  describe('Admin', () => {
    beforeEach(async () => {
      authToken = await getToken('admin');
    });

    it('should get bill pdf', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/bills/${billsList[0]._id}/pdfs`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('Other roles', () => {
    it('should return customer bills pdf if I am its helper', async () => {
      const helper = billUserList[0];
      const helperToken = await getTokenByCredentials(helper.local);
      const res = await app.inject({
        method: 'GET',
        url: `/bills/${billsList[0]._id}/pdfs`,
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
          url: `/bills/${billsList[0]._id}/pdfs`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('BILL ROUTES - GET /bills', () => {
  let authToken = null;
  beforeEach(populateDB);

  describe('Admin', () => {
    beforeEach(async () => {
      authToken = await getToken('admin');
    });

    it('should get all bills', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/bills',
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.bills.length).toBe(billsList.length);
    });
  });

  describe('Other roles', () => {
    it('should return customer bills if I am its helper', async () => {
      const helper = billUserList[0];
      const helperToken = await getTokenByCredentials(helper.local);
      const res = await app.inject({
        method: 'GET',
        url: `/bills?customer=${helper.customers[0]}`,
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
          url: '/bills',
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
