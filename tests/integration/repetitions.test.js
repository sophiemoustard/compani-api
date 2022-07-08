const expect = require('expect');
const { ObjectId } = require('mongodb');
const app = require('../../server');
const Repetition = require('../../src/models/Repetition');
const Event = require('../../src/models/Event');
const { auxiliariesIdList, repetitionList, populateDB, customersIdList } = require('./seed/repetitionsSeed');
const { getToken } = require('./helpers/authentication');
const { CompaniDate } = require('../../src/helpers/dates/companiDates');

describe('NODE ENV', () => {
  it('should be "test"', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('REPETITIONS ROUTES - GET /repetitions', () => {
  let authToken;
  describe('PLANNING_REFERENT', () => {
    beforeEach(populateDB);
    beforeEach(async () => { authToken = await getToken('planning_referent'); });

    it('should return a list of auxiliary\'s repetitions', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/repetitions?auxiliary=${auxiliariesIdList[0]}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(200);
      expect(response.result.data.repetitions.length).toEqual(2);
    });

    it('should return a list of customer\'s repetitions', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/repetitions?customer=${customersIdList[0]}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(200);
      expect(response.result.data.repetitions.length).toEqual(1);
    });

    it('should return an empty list if no repetition', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/repetitions?auxiliary=${auxiliariesIdList[1]}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(200);
      expect(response.result.data.repetitions.length).toEqual(0);
    });

    it('should return a 404 if auxiliary doesn\'t exist', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/repetitions?auxiliary=${new ObjectId()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(404);
    });

    it('should return a 404 if customer doesn\'t exist', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/repetitions?customer=${new ObjectId()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(404);
    });

    it('should returna 400 if both auxiliary and customer are missing in query', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/repetitions',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(400);
    });
  });

  describe('Other roles', () => {
    beforeEach(populateDB);

    const roles = [
      { name: 'helper', expectedCode: 403, erp: true },
      { name: 'auxiliary', expectedCode: 403, erp: true },
      { name: 'vendor_admin', expectedCode: 403, erp: true },
      { name: 'coach', expectedCode: 200, erp: true },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name, role.erp);

        const response = await app.inject({
          method: 'GET',
          url: `/repetitions?auxiliary=${auxiliariesIdList[0]}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('REPETITIONS ROUTES - DELETE /{_id}', () => {
  let authToken;
  const tomorrow = CompaniDate().add({ days: 1 }).toDate();

  describe('PLANNING_REFERENT', () => {
    beforeEach(populateDB);
    beforeEach(async () => { authToken = await getToken('planning_referent'); });
    it('should delete a repetition', async () => {
      const eventsCountBefore = await Event.countDocuments({ 'repetition.parentId': repetitionList[0].parentId });
      const response = await app.inject({
        method: 'DELETE',
        url: `/repetitions/${repetitionList[0]._id}?startDate=${tomorrow}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      const repetitionsCount = await Repetition.countDocuments();
      const eventsCountAfter = await Event.countDocuments({ 'repetition.parentId': repetitionList[0].parentId });

      expect(response.statusCode).toBe(200);
      expect(repetitionsCount).toBe(repetitionList.length - 1);
      expect(eventsCountBefore).toBe(1);
      expect(eventsCountAfter).toBe(0);
    });

    it('should return a 404 if repetition doesn\'t exist', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/repetitions/${new ObjectId()}?startDate=${'2022-07-01T00:00:00.000Z'}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(404);
    });

    it('should return a 400 if startDate is missing in query', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/repetitions/${repetitionList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(400);
    });

    it('should return a 400 if startDate is before today', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/repetitions/${repetitionList[0]._id}?startDate=${'2022-06-30T00:00:00.000Z'}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(400);
    });

    it('should return a 400 if startDate is after today + 90 days', async () => {
      const startDate = CompaniDate(tomorrow).add({ days: 93 }).toDate();
      const response = await app.inject({
        method: 'DELETE',
        url: `/repetitions/${repetitionList[0]._id}?startDate=${startDate}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(400);
    });
  });

  describe('Other roles', () => {
    beforeEach(populateDB);

    const roles = [
      { name: 'helper', expectedCode: 403, erp: true },
      { name: 'auxiliary', expectedCode: 403, erp: true },
      { name: 'vendor_admin', expectedCode: 403, erp: true },
      { name: 'coach', expectedCode: 200, erp: true },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name, role.erp);

        const response = await app.inject({
          method: 'DELETE',
          url: `/repetitions/${repetitionList[0]._id}?startDate=${tomorrow}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
