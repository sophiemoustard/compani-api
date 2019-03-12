const expect = require('expect');
const { ObjectID } = require('mongodb');

const { surchargesList, populateSurcharges } = require('./seed/surchargesSeed');
const { getToken } = require('./seed/usersSeed');
const Surcharge = require('../../models/Surcharge');
const app = require('../../server');

describe('SURCHARGES ROUTES', () => {
  let authToken = null;
  beforeEach(populateSurcharges);
  beforeEach(async () => {
    authToken = await getToken();
  });

  describe('POST /surcharges', () => {
    it('should create a new surcharge', async () => {
      const payload = {
        company: new ObjectID(),
        name: 'Chasse aux monstres automnaux',
        saturday: 35,
        sunday: 30,
        publicHoliday: 16,
        twentyFifthOfDecember: 60,
        firstOfMay: 40,
        evening: 20,
        eveningStartTime: '21:00',
        eveningEndTime: '23:59',
        custom: 55,
        customStartTime: '12:00',
        customEndTime: '14:00',
      };
      const response = await app.inject({
        method: 'POST',
        url: '/surcharges',
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(200);
      const surcharges = await Surcharge.find();
      expect(surcharges.length).toEqual(surchargesList.length + 1);
    });
  });

  describe('POST /surcharges', () => {
    it('should not create a new surcharge if there is no name', async () => {
      const payload = {
        company: new ObjectID(),
        saturday: 35,
        sunday: 30,
        publicHoliday: 16,
        twentyFifthOfDecember: 60,
        firstOfMay: 40,
        evening: 20,
        eveningStartTime: '21:00',
        eveningEndTime: '23:59',
        custom: 55,
        customStartTime: '12:00',
        customEndTime: '14:00',
      };
      const response = await app.inject({
        method: 'POST',
        url: '/surcharges',
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(400);
      const surcharges = await Surcharge.find();
      expect(surcharges.length).toEqual(surchargesList.length);
    });
  });

  describe('GET /surcharges', () => {
    it('should return surcharges', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/surcharges',
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.surcharges.length).toBe(surchargesList.length);
    });
  });

  describe('PUT /surcharges/:id', () => {
    it('should update surcharge', async () => {
      const payload = {
        name: 'Chasse aux monstres printaniers',
        saturday: 35,
        sunday: 30,
        publicHoliday: 16,
        twentyFifthOfDecember: 60,
        firstOfMay: 40,
        evening: 20,
        eveningStartTime: '21:00',
        eveningEndTime: '23:59',
        custom: 55,
        customStartTime: '12:00',
        customEndTime: '14:00',
      };
      const response = await app.inject({
        method: 'PUT',
        url: `/surcharges/${surchargesList[0]._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
        payload,
      });
      expect(response.statusCode).toBe(200);
      const surcharge = await Surcharge.findById(surchargesList[0]._id);
      expect(response.result.data.surcharge.length).toBe(surcharge.length);
    });

    it('should return 404 if no surcharge found', async () => {
      const invalidId = new ObjectID().toHexString();
      const payload = {
        name: 'Chasser sans son chien',
      };
      const response = await app.inject({
        method: 'PUT',
        url: `/surcharges/${invalidId}`,
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /surcharges/:id', () => {
    it('should delete surcharge', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/surcharges/${surchargesList[0]._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      const surcharges = await Surcharge.find();
      expect(surcharges.length).toBe(surchargesList.length - 1);
    });
  });
});
