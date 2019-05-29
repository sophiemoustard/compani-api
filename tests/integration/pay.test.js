const expect = require('expect');
const { ObjectID } = require('mongodb');
const { getToken } = require('./seed/usersSeed');
const { populateDB } = require('./seed/paySeed');
const app = require('../../server');
const Pay = require('../../models/Pay');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('Pay ROUTES', () => {
  let authToken = null;
  beforeEach(populateDB);
  beforeEach(async () => {
    authToken = await getToken();
  });

  describe('GET /pay/draft', () => {
    it('should compute draft pay', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/pay/draft?startDate=2019-04-30T22:00:00.000Z&endDate=2019-05-31T21:59:59.999Z',
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.draftPay).toBeDefined();
      expect(response.result.data.draftPay.length).toEqual(1);
    });
  });

  describe('POST /pay', () => {
    const payload = [{
      auxiliary: new ObjectID(),
      startDate: '2019-04-30T22:00:00',
      endDate: '2019-05-28T14:34:04',
      month: 'mai',
      contractHours: 38.97,
      workedHours: 2,
      surchargedAndNotExemptDetails: {},
      surchargedAndExemptDetails: {},
      notSurchargedAndNotExempt: 2,
      surchargedAndNotExempt: 0,
      notSurchargedAndExempt: 0,
      surchargedAndExempt: 0,
      hoursBalance: -36.97,
      hoursCounter: -36.97,
      overtimeHours: 0,
      additionalHours: 0,
      mutual: true,
      transport: 0,
      otherFees: 0,
      bonus: 0,
    }];

    it('should create a new pay', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/pay',
        headers: { 'x-access-token': authToken },
        payload
      });

      expect(response.statusCode).toBe(200);

      const payList = await Pay.find().lean();
      expect(payList.length).toEqual(1);
    });

    Object.keys(payload[0]).forEach((key) => {
      it(`should return a 400 error if missing '${key}' parameter`, async () => {
        const invalidPayload = { ...payload };
        delete invalidPayload[key];

        const res = await app.inject({
          method: 'POST',
          url: '/pay',
          payload: invalidPayload,
          headers: { 'x-access-token': authToken },
        });
        expect(res.statusCode).toBe(400);
      });
    });
  });
});
