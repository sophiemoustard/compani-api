const expect = require('expect');
const { ObjectID } = require('mongodb');
const { getToken } = require('./seed/usersSeed');
const { populateDB } = require('./seed/stcSeed');
const app = require('../../server');
const Stc = require('../../models/Stc');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('STC ROUTES', () => {
  let authToken = null;
  beforeEach(populateDB);
  beforeEach(async () => {
    authToken = await getToken();
  });

  describe('GET /stc/draft', () => {
    it('should compute draft stc', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/stc/draft?startDate=2019-04-30T22:00:00.000Z&endDate=2019-05-31T21:59:59.999Z',
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.draftStc).toBeDefined();
      expect(response.result.data.draftStc.length).toEqual(1);
    });
  });

  describe('POST /stc', () => {
    const payload = [{
      auxiliary: new ObjectID(),
      startDate: '2019-04-30T22:00:00.000Z',
      endDate: '2019-05-28T14:34:04.000Z',
      endReason: 'resignation',
      endNotificationDate: '2019-03-28T14:34:04.000Z',
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
      compensation: 0,
    }];

    it('should create a new stc', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/stc',
        headers: { 'x-access-token': authToken },
        payload
      });

      expect(response.statusCode).toBe(200);

      const stcList = await Stc.find().lean();
      expect(stcList.length).toEqual(1);
    });

    Object.keys(payload[0]).forEach((key) => {
      it(`should return a 400 error if missing '${key}' parameter`, async () => {
        const invalidPayload = { ...payload };
        delete invalidPayload[key];

        const res = await app.inject({
          method: 'POST',
          url: '/stc',
          payload: invalidPayload,
          headers: { 'x-access-token': authToken },
        });
        expect(res.statusCode).toBe(400);
      });
    });
  });
});
