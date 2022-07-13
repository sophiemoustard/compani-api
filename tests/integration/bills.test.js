const expect = require('expect');
const qs = require('qs');
const omit = require('lodash/omit');
const sinon = require('sinon');
const { ObjectId } = require('mongodb');
const app = require('../../server');
const {
  populateDB,
  billUserList,
  billList,
  authBillList,
  billCustomerList,
  billServices,
  eventList,
  billThirdPartyPayer,
  otherCompanyBillThirdPartyPayer,
  customerFromOtherCompany,
  fundingHistory,
  billingItemList,
} = require('./seed/billsSeed');
const { TWO_WEEKS } = require('../../src/helpers/constants');
const BillHelper = require('../../src/helpers/bills');
const { getToken, getTokenByCredentials } = require('./helpers/authentication');
const { authCompany } = require('../seed/authCompaniesSeed');
const Bill = require('../../src/models/Bill');
const BillNumber = require('../../src/models/BillNumber');
const CreditNote = require('../../src/models/CreditNote');
const FundingHistory = require('../../src/models/FundingHistory');
const Event = require('../../src/models/Event');
const PdfHelper = require('../../src/helpers/pdf');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('BILL ROUTES - GET /bills/drafts', () => {
  let authToken;
  beforeEach(populateDB);
  const query = {
    endDate: new Date('2021-08-31T23:59:59.999Z'),
    billingStartDate: new Date('2021-08-01T00:00:00.000Z'),
    billingPeriod: TWO_WEEKS,
  };

  describe('CLIENT_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should return all draft bills', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/bills/drafts?${qs.stringify(query)}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 404 if customer is not from the same company', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/bills/drafts?${qs.stringify(query)}&customer=${customerFromOtherCompany._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    ['endDate', 'billingStartDate', 'billingPeriod'].forEach((param) => {
      it(`should return a 400 error if '${param}' query is missing`, async () => {
        const response = await app.inject({
          method: 'GET',
          url: `/bills/drafts?${qs.stringify(omit(query, [param]))}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(400);
      });
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'coach', expectedCode: 403 },
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/bills/drafts?${qs.stringify(query)}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('BILL ROUTES - POST /bills/list', () => {
  let authToken;
  beforeEach(populateDB);
  const payload = [
    {
      customer: { _id: billCustomerList[0]._id, identity: billCustomerList[0].identity },
      endDate: '2019-05-30T23:59:59.999Z',
      customerBills: {
        bills: [
          {
            _id: new ObjectId(),
            subscription: {
              _id: billCustomerList[0].subscriptions[0]._id,
              service: billServices[0],
              versions: [
                {
                  _id: new ObjectId(),
                  unitTTCRate: 12,
                  weeklyHours: 12,
                  evenings: 2,
                  sundays: 1,
                  startDate: '2019-04-03T08:33:55.370Z',
                  createdAt: '2019-05-03T08:33:56.144Z',
                },
              ],
              createdAt: '2019-05-03T08:33:56.144Z',
            },
            discount: 0,
            startDate: '2019-05-01T00:00:00.000Z',
            endDate: '2019-05-31T23:59:59.999Z',
            unitExclTaxes: '10.714285714285714',
            unitInclTaxes: '12',
            vat: 12,
            eventsList: [
              {
                event: eventList[4]._id,
                auxiliary: new ObjectId(),
                startDate: '2019-05-02T08:00:00.000Z',
                endDate: '2019-05-02T10:00:00.000Z',
                inclTaxesCustomer: '24',
                exclTaxesCustomer: '21.428571428571427',
                surcharges: [{ percentage: 90, name: 'Noël' }],
              },
            ],
            hours: '2',
            exclTaxes: '21.428571428571427',
            inclTaxes: '24',
          },
        ],
        total: 24,
      },
      thirdPartyPayerBills: [
        {
          bills: [
            {
              _id: new ObjectId(),
              subscription: {
                _id: billCustomerList[0].subscriptions[0]._id,
                service: billServices[0],
                versions: [
                  {
                    _id: new ObjectId(),
                    unitTTCRate: 12,
                    weeklyHours: 12,
                    evenings: 2,
                    sundays: 1,
                    startDate: '2019-04-03T08:33:55.370Z',
                    createdAt: '2019-05-03T08:33:56.144Z',
                  },
                ],
                createdAt: '2019-05-03T08:33:56.144Z',
              },
              discount: 0,
              startDate: '2019-05-01T00:00:00.000Z',
              endDate: '2019-05-31T23:59:59.999Z',
              unitExclTaxes: '10.714285714285714',
              unitInclTaxes: '12',
              vat: 12,
              exclTaxes: '21.428571428571427',
              inclTaxes: '24',
              hours: '2',
              eventsList: [
                {
                  event: eventList[4]._id,
                  auxiliary: new ObjectId(),
                  startDate: '2019-05-02T08:00:00.000Z',
                  endDate: '2019-05-02T10:00:00.000Z',
                  inclTaxesTpp: '24',
                  exclTaxesTpp: '21.428571428571427',
                  thirdPartyPayer: billThirdPartyPayer._id,
                  inclTaxesCustomer: '0',
                  exclTaxesCustomer: '0',
                  history: { amountTTC: '24', fundingId: fundingHistory.fundingId, nature: 'fixed' },
                  fundingId: fundingHistory.fundingId,
                  nature: 'fixed',
                  surcharges: [{ percentage: 25, name: 'Soirée', startHour: '2017-05-02T10:00:00.000Z' }],
                },
              ],
              externalBilling: false,
              thirdPartyPayer: billThirdPartyPayer,
            },
          ],
          total: 24,
        },
      ],
    },
  ];
  const payloadWithTwoSubscriptions = [
    {
      customer: { _id: billCustomerList[0]._id, identity: billCustomerList[0].identity },
      endDate: '2019-05-30T23:59:59.999Z',
      customerBills: {
        bills: [
          {
            _id: new ObjectId(),
            subscription: {
              _id: billCustomerList[0].subscriptions[1]._id,
              service: billServices[1],
              versions: [
                {
                  _id: new ObjectId(),
                  unitTTCRate: 12,
                  weeklyHours: 12,
                  evenings: 2,
                  sundays: 1,
                  startDate: '2019-04-03T08:33:55.370Z',
                  createdAt: '2019-05-03T08:33:56.144Z',
                },
              ],
              createdAt: '2019-05-03T08:33:56.144Z',
            },
            discount: 0,
            startDate: '2019-05-01T00:00:00.000Z',
            endDate: '2019-05-31T23:59:59.999Z',
            unitExclTaxes: '10.714285714285714',
            unitInclTaxes: '12',
            vat: 12,
            eventsList: [
              {
                event: eventList[4]._id,
                auxiliary: new ObjectId(),
                startDate: '2019-05-02T08:00:00.000Z',
                endDate: '2019-05-02T10:00:00.000Z',
                inclTaxesCustomer: '24',
                exclTaxesCustomer: '21.428571428571427',
                surcharges: [{ percentage: 90, name: 'Noël' }],
              },
            ],
            hours: '2',
            exclTaxes: '21.428571428571427',
            inclTaxes: '24',
          },
          {
            _id: new ObjectId(),
            subscription: {
              _id: billCustomerList[0].subscriptions[0]._id,
              service: billServices[0],
              versions: [
                {
                  _id: new ObjectId(),
                  unitTTCRate: 12,
                  weeklyHours: 12,
                  evenings: 2,
                  sundays: 1,
                  startDate: '2019-04-03T08:33:55.370Z',
                  createdAt: '2019-05-03T08:33:56.144Z',
                },
              ],
              createdAt: '2019-05-03T08:33:56.144Z',
            },
            discount: 0,
            startDate: '2019-05-01T00:00:00.000Z',
            endDate: '2019-05-31T23:59:59.999Z',
            unitExclTaxes: '10.714285714285714',
            unitInclTaxes: '12',
            vat: 12,
            eventsList: [
              {
                event: eventList[4]._id,
                auxiliary: new ObjectId(),
                startDate: '2019-05-02T08:00:00.000Z',
                endDate: '2019-05-02T10:00:00.000Z',
                inclTaxesCustomer: '24',
                exclTaxesCustomer: '21.428571428571427',
                surcharges: [{ percentage: 90, name: 'Noël' }],
              },
            ],
            hours: '2',
            exclTaxes: '21.428571428571427',
            inclTaxes: '24',
          },
        ],
        total: 24,
      },
    },
  ];

  describe('CLIENT_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should create new bills', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/bills/list',
        payload: { bills: payload },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);

      const billCount = await Bill.countDocuments({ company: authCompany._id });
      expect(billCount).toBe(2 + authBillList.length);

      const creditNote = await CreditNote.find({ customer: billCustomerList[0]._id, company: authCompany._id }).lean();
      expect(creditNote[0].isEditable).toBeFalsy();
    });

    it('should create new bills (2 subscriptions)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/bills/list',
        payload: { bills: payloadWithTwoSubscriptions },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const billsCount = await Bill.countDocuments({ company: authCompany._id });
      expect(billsCount).toBe(1 + authBillList.length);
    });

    it('should not create new bill with existing number', async () => {
      const formatBillNumber = sinon.stub(BillHelper, 'formatBillNumber');
      formatBillNumber.returns(billList[0].number);

      const response = await app.inject({
        method: 'POST',
        url: '/bills/list',
        payload: { bills: payload },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(409);
      formatBillNumber.restore();

      const billCountAfter = await Bill.countDocuments();
      expect(billCountAfter).toEqual(authBillList.length + billList.length);

      const billNumberAfter = await BillNumber.countDocuments({ prefix: '0519', seq: 2 });
      expect(billNumberAfter).toEqual(1);

      const fundingHistoryAfter = await FundingHistory.countDocuments({
        fundingId: fundingHistory.fundingId,
        amountTTC: fundingHistory.amountTTC,
      });
      expect(fundingHistoryAfter).toEqual(1);

      const eventInBill = await Event
        .countDocuments({ _id: eventList[4]._id, bills: { surcharges: [], billingItems: [] }, isBilled: false });
      expect(eventInBill).toEqual(1);
    });

    it('should create new bill with vat 0 if service is not taxed', async () => {
      const draftBillPayload = [
        {
          customer: {
            _id: billCustomerList[0]._id,
            identity: billCustomerList[0].identity,
          },
          endDate: '2019-05-31T23:59:59.999Z',
          customerBills: {
            bills: [
              {
                _id: new ObjectId(),
                subscription: {
                  _id: billCustomerList[0].subscriptions[0]._id,
                  service: {
                    ...billServices[0],
                    versions: [{
                      defaultUnitAmount: 12,
                      name: 'Service 1',
                      startDate: '2019-01-16 17:58:15.519',
                      vat: 0,
                    }],
                  },
                  versions: [
                    {
                      _id: new ObjectId(),
                      unitTTCRate: 12,
                      weeklyHours: 12,
                      evenings: 2,
                      sundays: 1,
                      startDate: '2019-04-03T08:33:55.370Z',
                      createdAt: '2019-05-03T08:33:56.144Z',
                    },
                  ],
                  createdAt: '2019-05-03T08:33:56.144Z',
                },
                discount: 0,
                startDate: '2019-05-01T00:00:00.000Z',
                endDate: '2019-05-31T23:59:59.999Z',
                unitExclTaxes: '10.714285714285714',
                unitInclTaxes: '12',
                vat: 0,
                eventsList: [
                  {
                    event: eventList[4]._id,
                    auxiliary: new ObjectId(),
                    startDate: '2019-05-02T08:00:00.000Z',
                    endDate: '2019-05-02T10:00:00.000Z',
                    inclTaxesCustomer: '24',
                    exclTaxesCustomer: '24',
                    surcharges: [{ percentage: 90, name: 'Noël' }],
                  },
                ],
                hours: '2',
                exclTaxes: '24',
                inclTaxes: '24',
              },
            ],
            total: 24,
          },
        },
      ];
      const response = await app.inject({
        method: 'POST',
        url: '/bills/list',
        payload: { bills: draftBillPayload },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const bills = await Bill.countDocuments({ 'subscriptions.vat': 0, company: authCompany._id });
      expect(bills).toBe(1);
    });

    it('should create a new external bill', async () => {
      const fundingId = new ObjectId();
      const draftBillPayload = [{
        customer: { _id: billCustomerList[0]._id, identity: billCustomerList[0].identity },
        endDate: '2019-05-31T23:59:59.999Z',
        customerBills: { bills: [], total: 0 },
        thirdPartyPayerBills: [{
          bills: [{
            _id: new ObjectId(),
            subscription: {
              _id: billCustomerList[0].subscriptions[0]._id,
              service: billServices[0],
              versions: [{
                _id: new ObjectId(),
                unitTTCRate: 12,
                weeklyHours: 12,
                evenings: 2,
                sundays: 1,
                startDate: '2019-04-03T08:33:55.370Z',
                createdAt: '2019-05-03T08:33:56.144Z',
              }],
              createdAt: '2019-05-03T08:33:56.144Z',
            },
            discount: 0,
            startDate: '2019-05-01T00:00:00.000Z',
            endDate: '2019-05-31T23:59:59.999Z',
            unitExclTaxes: '10.714285714285714',
            unitInclTaxes: '12',
            vat: 12,
            exclTaxes: '21.428571428571427',
            inclTaxes: '24',
            hours: '2',
            eventsList: [{
              event: eventList[4]._id,
              auxiliary: new ObjectId(),
              startDate: '2019-05-02T08:00:00.000Z',
              endDate: '2019-05-02T10:00:00.000Z',
              inclTaxesTpp: '24',
              exclTaxesTpp: '21.428571428571427',
              thirdPartyPayer: billThirdPartyPayer._id,
              inclTaxesCustomer: '0',
              exclTaxesCustomer: '0',
              history: { amountTTC: 24, fundingId, nature: 'fixed' },
              fundingId,
              nature: 'fixed',
            }],
            externalBilling: true,
            thirdPartyPayer: billThirdPartyPayer,
          }],
          total: 24,
        }],
      }];

      const response = await app.inject({
        method: 'POST',
        url: '/bills/list',
        payload: { bills: draftBillPayload },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);

      const bills = await Bill.find({ company: authCompany._id }, { number: 1 }).lean();
      expect(bills.some(bill => !bill.number)).toBeTruthy();

      const draftBillsLength = draftBillPayload[0].thirdPartyPayerBills[0].bills.length;
      expect(bills.length).toBe(draftBillsLength + authBillList.length);
    });

    it('should create a bill with billingItems', async () => {
      const billsWithBillingItemBefore = await Bill.countDocuments({
        company: authCompany._id,
        billingItemList: { $exists: true, $ne: [] },
      });

      const draftBillPayload = [{
        customer: { _id: billCustomerList[0]._id, identity: billCustomerList[0].identity },
        endDate: '2019-05-30T23:59:59.999Z',
        customerBills: {
          bills: [
            payload[0].customerBills.bills[0],
            {
              _id: new ObjectId(),
              discount: 0,
              startDate: '2019-05-01T00:00:00.000Z',
              endDate: '2019-05-31T23:59:59.999Z',
              unitExclTaxes: '10.714285714285714',
              unitInclTaxes: '12',
              vat: 12,
              eventsList: [{
                event: eventList[4]._id,
                auxiliary: new ObjectId(),
                startDate: '2019-05-02T08:00:00.000Z',
                endDate: '2019-05-02T10:00:00.000Z',
                inclTaxesCustomer: '24',
                exclTaxesCustomer: '21.428571428571427',
                surcharges: [{ percentage: 90, name: 'Noël' }],
              }],
              hours: '2',
              exclTaxes: '21.428571428571427',
              inclTaxes: '24',
              billingItem: { _id: billingItemList[0]._id, name: 'Billing Joel' },
            },
          ],
          total: 48,
        },
      }];

      const response = await app.inject({
        method: 'POST',
        url: '/bills/list',
        payload: { bills: draftBillPayload },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);

      const billsWithBillingItemAfter = await Bill.countDocuments({
        company: authCompany._id,
        billingItemList: { $exists: true, $ne: [] },
      });
      expect(billsWithBillingItemAfter).toBe(1 + billsWithBillingItemBefore);

      const eventInBill = await Event.countDocuments({ _id: eventList[4]._id, isBilled: true });
      expect(eventInBill).toEqual(1);
    });

    it('should return a 403 error if customer is not from same company', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/bills/list',
        payload: { bills: [{ ...payload[0], customer: { ...payload[0].customer, _id: billCustomerList[2]._id } }] },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return a 403 error if customer is archived', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/bills/list',
        payload: { bills: [{ ...payload[0], customer: { ...payload[0].customer, _id: billCustomerList[3]._id } }] },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return a 403 error if third party payer is not from same company', async () => {
      const bills = [{
        ...payload[0],
        thirdPartyPayerBills: [{
          ...payload[0].thirdPartyPayerBills[0],
          bills: [{ ...payload[0].thirdPartyPayerBills[0].bills[0], thirdPartyPayer: otherCompanyBillThirdPartyPayer }],
        }],
      }];

      const response = await app.inject({
        method: 'POST',
        url: '/bills/list',
        payload: { bills },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return a 403 error if at least one event is not from same company', async () => {
      const bills = [{
        ...payload[0],
        customerBills: {
          ...payload[0].customerBills,
          bills: [{
            ...payload[0].customerBills.bills[0],
            eventsList: [{
              event: eventList[5]._id,
              auxiliary: new ObjectId(),
              startDate: '2019-05-02T08:00:00.000Z',
              endDate: '2019-05-02T10:00:00.000Z',
              inclTaxesCustomer: '24',
              exclTaxesCustomer: '24',
              surcharges: [{ percentage: 90, name: 'Noël' }],
            }],
          }],
        },
      }];

      const response = await app.inject({
        method: 'POST',
        url: '/bills/list',
        payload: { bills },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return a 403 error if at least one bill subscription is not from same company', async () => {
      const bills = [{
        ...payload[0],
        customerBills: {
          ...payload[0].customerBills,
          bills: [{
            ...payload[0].customerBills.bills[0],
            subscription: {
              _id: billCustomerList[2].subscriptions[0]._id,
              service: billServices[1],
              versions: [{
                _id: new ObjectId(),
                unitTTCRate: '12',
                weeklyHours: 12,
                evenings: 2,
                sundays: 1,
                startDate: '2019-04-03T08:33:55.370Z',
                createdAt: '2019-05-03T08:33:56.144Z',
              }],
              createdAt: '2019-05-03T08:33:56.144Z',
            },
          }],
        },
      }];

      const response = await app.inject({
        method: 'POST',
        url: '/bills/list',
        payload: { bills },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return a 403 error if a billingItem is not from same company', async () => {
      const draftBillPayload = [{
        customer: { _id: billCustomerList[0]._id, identity: billCustomerList[0].identity },
        endDate: '2019-05-30T23:59:59.999Z',
        customerBills: {
          bills: [
            {
              _id: new ObjectId(),
              discount: 0,
              startDate: '2019-05-01T00:00:00.000Z',
              endDate: '2019-05-31T23:59:59.999Z',
              unitExclTaxes: '10.714285714285714',
              unitInclTaxes: '12',
              vat: 12,
              eventsList: [{
                event: eventList[4]._id,
                auxiliary: new ObjectId(),
                startDate: '2019-05-02T08:00:00.000Z',
                endDate: '2019-05-02T10:00:00.000Z',
                inclTaxesCustomer: '24',
                exclTaxesCustomer: '21.428571428571427',
                surcharges: [{ percentage: 90, name: 'Noël' }],
              }],
              hours: '2',
              exclTaxes: '21.428571428571427',
              inclTaxes: '24',
              billingItem: { _id: billingItemList[2]._id, name: 'Billingbo Le Hobbit' },
            },
          ],
          total: 48,
        },
      }];

      const response = await app.inject({
        method: 'POST',
        url: '/bills/list',
        payload: { bills: draftBillPayload },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403, erp: true },
      { name: 'planning_referent', expectedCode: 403, erp: true },
      { name: 'coach', expectedCode: 403, erp: true },
      { name: 'client_admin', expectedCode: 403, erp: false },
      { name: 'vendor_admin', expectedCode: 403, erp: false },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}${role.erp ? '' : ' without erp'}`, async () => {
        authToken = await getToken(role.name, role.erp);
        const response = await app.inject({
          method: 'POST',
          url: '/bills/list',
          payload: { bills: payload },
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('BILL ROUTES - GET /bills/', () => {
  let authToken;
  beforeEach(populateDB);

  describe('CLIENT_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should return all manual bills from authCompany', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/bills?type=manual',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.bills.length).toBe(1);
    });

    it('should return automatic bills from authCompany between two dates', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/bills?type=automatic&startDate=2019-05-20T10:00:00.000Z&endDate=2019-05-27T10:00:00.000Z',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.bills.length).toBe(1);
    });

    it('should return a 403 if type is automatic and period is more than one year', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/bills?type=automatic&startDate=2019-05-20T10:00:00.000Z&endDate=2021-05-27T10:00:00.000Z',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 400 if wrong type in query', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/bills?type=wrongType',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 if type is automatic and dates are missing in query', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/bills?type=automatic',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if wrong dates in query', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/bills?type=automatic&startDate=2022-07-01T10:00:00.000Z&endDate=2022-06-30T10:00:00.000Z',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403, erp: true },
      { name: 'planning_referent', expectedCode: 403, erp: true },
      { name: 'coach', expectedCode: 403, erp: true },
      { name: 'client_admin', expectedCode: 403, erp: false },
      { name: 'vendor_admin', expectedCode: 403, erp: false },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}${role.erp ? '' : ' without erp'}`, async () => {
        authToken = await getToken(role.name, role.erp);

        const response = await app.inject({
          method: 'GET',
          url: '/bills?type=manual',
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('BILL ROUTES - POST /bills', () => {
  let authToken;
  beforeEach(populateDB);

  describe('CLIENT_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should create a new bill', async () => {
      const payload = {
        customer: billCustomerList[0]._id,
        date: new Date('2021-09-02T20:00:00'),
        shouldBeSent: true,
        billingItemList: [{ billingItem: billingItemList[0]._id, unitInclTaxes: 15, count: 2 }],
      };
      const response = await app.inject({
        method: 'POST',
        url: '/bills',
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);

      const billsCount = await Bill.countDocuments({ company: authCompany._id });
      expect(billsCount).toBe(1 + authBillList.length);
    });

    const missingParams = ['customer', 'date', 'shouldBeSent'];
    missingParams.forEach((param) => {
      it(`should return 400 as ${param} is missing`, async () => {
        const payload = {
          customer: billCustomerList[0]._id,
          date: new Date('2021-09-02T20:00:00'),
          shouldBeSent: true,
          billingItemList: [{ billingItem: billingItemList[0]._id, unitInclTaxes: 15, count: 2 }],
        };
        const response = await app.inject({
          method: 'POST',
          url: '/bills',
          payload: omit(payload, param),
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(400);
      });
    });

    const missingKeys = ['billingItem', 'unitInclTaxes', 'count'];
    missingKeys.forEach((param) => {
      it(`should return 400 as ${param} is missing`, async () => {
        const billingItem = omit({ billingItem: billingItemList[0]._id, unitInclTaxes: 15, count: 2 }, param);
        const payload = {
          customer: billCustomerList[0]._id,
          date: new Date('2021-09-02T20:00:00'),
          shouldBeSent: true,
          billingItemList: [billingItem],
        };
        const response = await app.inject({
          method: 'POST',
          url: '/bills',
          payload,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(400);
      });
    });

    it('should return 403 if customer doesn\'t exists', async () => {
      const payload = {
        customer: new ObjectId(),
        date: new Date('2021-09-02T20:00:00'),
        shouldBeSent: true,
        billingItemList: [{ billingItem: billingItemList[0]._id, unitInclTaxes: 15, count: 2 }],
      };
      const response = await app.inject({
        method: 'POST',
        url: '/bills',
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 if some billingItem doesn\'t exists', async () => {
      const payload = {
        customer: billCustomerList[0]._id,
        date: new Date('2021-09-02T20:00:00'),
        shouldBeSent: true,
        billingItemList: [
          { billingItem: billingItemList[0]._id, unitInclTaxes: 15, count: 2 },
          { billingItem: new ObjectId(), unitInclTaxes: 15, count: 2 },
        ],
      };
      const response = await app.inject({
        method: 'POST',
        url: '/bills',
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return a 403 if some billingItem isn’t type manual', async () => {
      const payload = {
        customer: billCustomerList[0]._id,
        date: new Date('2021-09-02T20:00:00'),
        shouldBeSent: true,
        billingItemList: [{ billingItem: billingItemList[1]._id, unitInclTaxes: 15, count: 2 }],
      };
      const response = await app.inject({
        method: 'POST',
        url: '/bills',
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return a 403 if the customer is archived', async () => {
      const payload = {
        customer: billCustomerList[3]._id,
        date: new Date('2021-09-02T20:00:00'),
        shouldBeSent: true,
        billingItemList: [{ billingItem: billingItemList[0]._id, unitInclTaxes: 15, count: 2 }],
      };
      const response = await app.inject({
        method: 'POST',
        url: '/bills',
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 409 billNumber is already taken', async () => {
      const formatBillNumber = sinon.stub(BillHelper, 'formatBillNumber');
      formatBillNumber.returns(billList[0].number);

      const payload = {
        customer: billCustomerList[0]._id,
        date: new Date('2021-09-02T20:00:00'),
        shouldBeSent: true,
        billingItemList: [{ billingItem: billingItemList[0]._id, unitInclTaxes: 15, count: 2 }],
      };
      const response = await app.inject({
        method: 'POST',
        url: '/bills',
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(409);
      formatBillNumber.restore();
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403, erp: true },
      { name: 'planning_referent', expectedCode: 403, erp: true },
      { name: 'coach', expectedCode: 403, erp: true },
      { name: 'client_admin', expectedCode: 403, erp: false },
      { name: 'vendor_admin', expectedCode: 403, erp: false },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}${role.erp ? '' : ' without erp'}`, async () => {
        authToken = await getToken(role.name, role.erp);

        const payload = {
          customer: new ObjectId(),
          date: '2021-09-02T20:00:00',
          shouldBeSent: true,
          billingItemList: [{ billingItem: billingItemList[0]._id, unitInclTaxes: 15, count: 2 }],
        };

        const response = await app.inject({
          method: 'POST',
          url: '/bills',
          payload,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('BILL ROUTES - GET /bills/pdfs', () => {
  let authToken;
  beforeEach(populateDB);

  describe('COACH', () => {
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    it('should get bill pdf', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/bills/${authBillList[0]._id}/pdfs`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return a 404 error if bill customer is not from same company', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/bills/${billList[0]._id}/pdfs`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    let generatePdf;
    beforeEach(() => {
      generatePdf = sinon.stub(PdfHelper, 'generatePdf');
    });
    afterEach(() => {
      generatePdf.restore();
    });

    it('should return customer bills pdf if I am its helper', async () => {
      generatePdf.returns('pdf');
      authToken = await getTokenByCredentials(billUserList[0].local);
      const res = await app.inject({
        method: 'GET',
        url: `/bills/${authBillList[0]._id}/pdfs`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });
      expect(res.statusCode).toBe(200);
    });

    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        generatePdf.returns('pdf');
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/bills/${authBillList[0]._id}/pdfs`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
