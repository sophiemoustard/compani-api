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
const { TWO_WEEKS } = require('../../helpers/constants');

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
  beforeEach(async () => {
    authToken = await getToken();
  });

  describe('GET /bills/drafts', () => {
    const query = {
      endDate: moment().add(1, 'd').endOf('day').toDate(),
      billingStartDate: moment().subtract(1, 'd').startOf('day').toDate(),
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
});
