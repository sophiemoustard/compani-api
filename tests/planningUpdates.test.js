const expect = require('expect');

const app = require('../server');
const { getToken, populateUsers, userList } = require('./seed/usersSeed');
const { populateRoles } = require('./seed/rolesSeed');
const {
  populatePlanningUpdates,
  planningUpdatePayload,
  planningUpdatesList,
  statusPayload
} = require('./seed/planningUpdatesSeed');
const User = require('../models/User');

describe('PLANNING UPDATES ROUTES', () => {
  let token = null;
  beforeEach(populateRoles);
  beforeEach(populateUsers);
  beforeEach(populatePlanningUpdates);
  beforeEach(async () => {
    token = await getToken();
  });

  describe('GET /planningUpdates', () => {
    it('should return planning updates list', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/planningUpdates',
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(200);
      let total = 0;
      res.result.data.modifPlanning.forEach((modif) => {
        total += modif.planningModification.length;
      });
      expect(total).toBe(3);
    });

    it('should return list with userId query param', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/planningUpdates?userId=${userList[3]._id}`,
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.modifPlanning[0].planningModification.length).toBe(2);
    });

    it('should return a 400 error if query param is invalid', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/planningUpdates?toto=test',
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /planningUpdates', () => {
    it('should store planning update for user specified in query', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/planningUpdates?userId=${userList[3]._id}`,
        payload: planningUpdatePayload,
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.userModificationPlanningStored.planningModification).toEqual(expect.arrayContaining([
        expect.objectContaining({
          _id: expect.any(Object),
          content: planningUpdatePayload.content,
          involved: planningUpdatePayload.involved,
          modificationType: planningUpdatePayload.type
        })
      ]));
    });

    it("should return a 400 error if there is not 'userId / employee_id' query param", async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/planningUpdates',
        payload: planningUpdatePayload,
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(400);
    });

    it('should return a 400 error if there is not type param in payload', async () => {
      delete planningUpdatePayload.type;
      const res = await app.inject({
        method: 'POST',
        url: '/planningUpdates',
        payload: planningUpdatePayload,
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('PUT /planningUpdates/{_id}/status', () => {
    it('should update planning update', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/planningUpdates/${planningUpdatesList[0]._id}/status`,
        payload: statusPayload,
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.modificationPlanningUpdated.planningModification).toEqual(expect.arrayContaining([
        expect.objectContaining({
          check: expect.objectContaining({
            isChecked: statusPayload.isChecked,
            checkBy: statusPayload.checkBy,
            checkedAt: expect.any(Date)
          })
        })
      ]));
    });
    it('should provide payload with default values if not provided', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/planningUpdates/${planningUpdatesList[0]._id}/status`,
        payload: {},
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.modificationPlanningUpdated.planningModification).toEqual(expect.arrayContaining([
        expect.objectContaining({
          check: expect.objectContaining({
            isChecked: false,
            checkBy: null,
            checkedAt: null
          })
        })
      ]));
    });

    it('should return a 400 error if id is invalid', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/planningUpdates/123456/status',
        payload: statusPayload,
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('DELETE /planningUpdates/{_id}', () => {
    it('should remove planning update', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/planningUpdates/${planningUpdatesList[0]._id}?userId=${userList[3]._id}`,
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(200);
      const planningUpdate = await User.findOne({ 'planningModification._id': planningUpdatesList[0]._id });
      expect(planningUpdate).toBeNull();
    });

    it("should return a 400 error if 'userId' query param is missing", async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/planningUpdates/${planningUpdatesList[0]._id}`,
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(400);
    });

    it('should return a 400 error if id is invalid', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/planningUpdates/123456',
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(400);
    });
  });
});
