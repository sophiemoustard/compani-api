const expect = require('expect');
const omit = require('lodash/omit');
const { ObjectID } = require('mongodb');
const app = require('../../server');
const Step = require('../../src/models/Step');
const { populateDB, stepsList, activitiesList, cardsList } = require('./seed/stepsSeed');
const Activity = require('../../src/models/Activity');
const { getToken } = require('./seed/authenticationSeed');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('STEPS ROUTES - PUT /steps/{_id}', () => {
  let authToken = null;
  beforeEach(populateDB);
  const stepId = stepsList[0]._id;

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should update step name', async () => {
      const payload = { name: 'une nouvelle étape super innovant' };
      const response = await app.inject({
        method: 'PUT',
        url: `/steps/${stepId.toHexString()}`,
        payload,
        headers: { 'x-access-token': authToken },
      });

      const stepUpdated = await Step.findById(stepId);

      expect(response.statusCode).toBe(200);
      expect(stepUpdated).toEqual(expect.objectContaining({ _id: stepId, name: payload.name }));
    });

    it('should update activities', async () => {
      const payload = { activities: [stepsList[0].activities[1], stepsList[0].activities[0]] };
      const response = await app.inject({
        method: 'PUT',
        url: `/steps/${stepId.toHexString()}`,
        payload,
        headers: { 'x-access-token': authToken },
      });

      const stepUpdated = await Step.findById(stepId).lean();

      expect(response.statusCode).toBe(200);
      expect(stepUpdated).toEqual(expect.objectContaining({ _id: stepId, activities: payload.activities }));
    });

    it('should return a 400 if payload is empty', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/steps/${stepId.toHexString()}`,
        payload: {},
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 if name is equal to \'\' ', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/steps/${stepId.toHexString()}`,
        payload: { name: '' },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 if lengths are not equal', async () => {
      const payload = { activities: [stepsList[0].activities[1]] };
      const response = await app.inject({
        method: 'PUT',
        url: `/steps/${stepId.toHexString()}`,
        payload,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 if actvities from payload and from db are not the same', async () => {
      const payload = { activities: [stepsList[0].activities[1], new ObjectID()] };
      const response = await app.inject({
        method: 'PUT',
        url: `/steps/${stepId.toHexString()}`,
        payload,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Other roles', () => {
    const payload = { name: 'une nouvelle étape super innovant' };
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'training_organisation_manager', expectedCode: 200 },
      { name: 'trainer', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'PUT',
          payload,
          url: `/steps/${stepId.toHexString()}`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('STEPS ROUTES - POST /steps/{_id}/activity', () => {
  let authToken = null;
  beforeEach(populateDB);
  const payload = { name: 'new activity', type: 'video' };
  const step = stepsList[0];

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    describe('creation', () => {
      it('should create activity', async () => {
        const response = await app.inject({
          method: 'POST',
          url: `/steps/${step._id.toHexString()}/activities`,
          payload,
          headers: { 'x-access-token': authToken },
        });

        const stepUpdated = await Step.findById(step._id);

        expect(response.statusCode).toBe(200);
        expect(stepUpdated._id).toEqual(step._id);
        expect(stepUpdated.activities.length).toEqual(step.activities.length + 1);
      });

      ['name', 'type'].forEach((missingParam) => {
        it('should return a 400 if missing requiered param', async () => {
          const response = await app.inject({
            method: 'POST',
            url: `/steps/${step._id.toHexString()}/activities`,
            payload: omit(payload, missingParam),
            headers: { 'x-access-token': authToken },
          });

          expect(response.statusCode).toBe(400);
        });
      });

      it('should return a 400 if invalid type', async () => {
        const wrongPayload = { ...payload, type: 'something_wrong' };
        const response = await app.inject({
          method: 'POST',
          url: `/steps/${step._id.toHexString()}/activities`,
          payload: wrongPayload,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(400);
      });
    });

    it('should duplicate an activity', async () => {
      const duplicatedActivityId = activitiesList[0]._id;
      const duplicatedCardId = cardsList[0]._id;
      const response = await app.inject({
        method: 'POST',
        url: `/steps/${step._id.toHexString()}/activities`,
        payload: { activityId: activitiesList[0]._id },
        headers: { 'x-access-token': authToken },
      });

      const stepUpdated = await Step.findById(step._id)
        .populate({
          path: 'activities',
          select: '-__v -createdAt -updatedAt -status',
          populate: { path: 'cards', select: '-__v -createdAt -updatedAt' },
        })
        .lean();

      expect(response.statusCode).toBe(200);
      expect(stepUpdated).toEqual(expect.objectContaining({
        _id: step._id,
        name: 'c\'est une étape',
        type: 'on_site',
        status: 'draft',
        activities: expect.arrayContaining([
          {
            _id: expect.any(ObjectID),
            type: 'lesson',
            name: 'chanter',
            cards: expect.arrayContaining([
              { _id: expect.any(ObjectID), template: 'transition', title: 'do mi sol do' },
            ]),
          },
        ]),
      }));
      expect(stepUpdated.activities[0]._id).not.toBe(duplicatedActivityId);
      expect(stepUpdated.activities[0].cards[0]._id).not.toBe(duplicatedCardId);
    });

    it('should return a 400 if step does not exist', async () => {
      const invalidId = new ObjectID();
      const response = await app.inject({
        method: 'POST',
        url: `/steps/${invalidId}/activities`,
        payload,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'training_organisation_manager', expectedCode: 200 },
      { name: 'trainer', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'POST',
          payload,
          url: `/steps/${step._id.toHexString()}/activities`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('STEPS ROUTES - PUT /steps/{_id}/activities', () => {
  let authToken = null;
  beforeEach(populateDB);
  const stepId = stepsList[0]._id;

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should push a reused activity', async () => {
      const payload = { activities: activitiesList[0]._id };
      const reusedActivityId = activitiesList[0]._id;
      const reusedCardId = cardsList[0]._id;
      const response = await app.inject({
        method: 'PUT',
        url: `/steps/${stepId.toHexString()}/activities`,
        payload,
        headers: { 'x-access-token': authToken },
      });

      const stepUpdated = await Step.findById(stepId)
        .populate({
          path: 'activities',
          select: '-__v -createdAt -updatedAt -status',
          populate: { path: 'cards', select: '-__v -createdAt -updatedAt' },
        })
        .lean();

      expect(response.statusCode).toBe(200);
      expect(stepUpdated).toEqual(expect.objectContaining({
        _id: stepId,
        name: 'c\'est une étape',
        type: 'on_site',
        status: 'draft',
        activities: expect.arrayContaining([
          {
            _id: reusedActivityId,
            type: 'lesson',
            name: 'chanter',
            cards: expect.arrayContaining([
              { _id: reusedCardId, template: 'transition', title: 'do mi sol do' },
            ]),
          },
        ]),
      }));
    });

    it('should not push a reused activity from the same step', async () => {
      const payload = { activities: activitiesList[1]._id };
      const response = await app.inject({
        method: 'PUT',
        url: `/steps/${stepId.toHexString()}/activities`,
        payload,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should not push an invalid activityid', async () => {
      const payload = { activities: (new ObjectID()).toHexString() };
      const response = await app.inject({
        method: 'PUT',
        url: `/steps/${stepId.toHexString()}/activities`,
        payload,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Other roles', () => {
    const payload = { activities: activitiesList[0]._id };
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'training_organisation_manager', expectedCode: 200 },
      { name: 'trainer', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'PUT',
          payload,
          url: `/steps/${stepId.toHexString()}/activities`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('STEPS ROUTES - DELETE /steps/{_id}/activities/{activityId}', () => {
  let authToken = null;
  const step = stepsList[1];
  const activityId = activitiesList[0]._id;
  beforeEach(populateDB);

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should detach activity from step', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/steps/${step._id.toHexString()}/activities/${activityId.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      const stepUpdated = await Step.findById(step._id);
      const detachedActivity = await Activity.findById(activityId);

      expect(response.statusCode).toBe(200);
      expect(stepUpdated._id).toEqual(step._id);
      expect(stepUpdated.activities.length).toEqual(step.activities.length - 1);
      expect(detachedActivity._id).toEqual(activityId);
    });

    it('should return a 404 if step does not exist', async () => {
      const unknownStepId = new ObjectID();
      const response = await app.inject({
        method: 'DELETE',
        url: `/steps/${unknownStepId.toHexString()}/activities/${activityId.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 404 if step does not contain activity', async () => {
      const invalidActivityId = activitiesList[1]._id;
      const response = await app.inject({
        method: 'DELETE',
        url: `/steps/${step._id.toHexString()}/activities/${invalidActivityId.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'training_organisation_manager', expectedCode: 200 },
      { name: 'trainer', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'DELETE',
          url: `/steps/${step._id.toHexString()}/activities/${activityId.toHexString()}`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
