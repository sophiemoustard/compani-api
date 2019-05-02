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
      endDate: moment().endOf('month').toDate(),
      billingStartDate: moment().startOf('month').toDate(),
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
    let createPayload = null;
    before(async () => {
      const query = {
        endDate: moment().endOf('month').toDate(),
        billingStartDate: moment().startOf('month').toDate(),
        billingPeriod: TWO_WEEKS
      };

      const response = await app.inject({
        method: 'GET',
        url: `/bills/drafts?${qs.stringify(query)}`,
        headers: { 'x-access-token': authToken },
      });

      createPayload = { bills: response.result.data.draftBills };
    });
    it('should create new bills', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/bills',
        payload: createPayload,
        headers: { 'x-access-token': authToken }
      });

      expect(response.statusCode).toBe(200);
      const bills = await Bill.find().lean();
      const draftBillsLength = createPayload.bills[0].customerBills.bills.length + createPayload.bills[0].customerBills.bills.length;
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
