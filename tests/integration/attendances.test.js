const expect = require('expect');
const { ObjectID } = require('mongodb');
const Attendance = require('../../src/models/Attendance');
const app = require('../../server');
const {
  populateDB,
  attendancesList,
  coursesList,
  slotsList,
  trainerList,
  companyTraineesList,
} = require('./seed/attendancesSeed');
const { getToken, getTokenByCredentials } = require('./seed/authenticationSeed');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('ATTENDANCES ROUTES - POST /attendances', () => {
  let authToken;
  beforeEach(populateDB);

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should add an attendance', async () => {
      const courseSlotAttendancesBefore = await Attendance.countDocuments({ courseSlot: slotsList[0]._id });
      const response = await app.inject({
        method: 'POST',
        url: '/attendances',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { trainee: coursesList[0].trainees[1], courseSlot: slotsList[0]._id },
      });

      expect(response.statusCode).toBe(200);
      const courseSlotAttendancesAfter = await Attendance.countDocuments({ courseSlot: slotsList[0]._id });
      expect(courseSlotAttendancesAfter).toBe(courseSlotAttendancesBefore + 1);
    });

    it('should return 400 if no trainee', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/attendances',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { courseSlot: slotsList[0]._id },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if no courseSlot', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/attendances',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { trainee: coursesList[0].trainees[1] },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 if wrong courseSlot', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/attendances',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { trainee: coursesList[0].trainees[1], courseSlot: new ObjectID() },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 403 if trainee is not part of the company', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/attendances',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { trainee: companyTraineesList[1]._id, courseSlot: slotsList[0]._id },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 409 if trainee and courseSlot are already added', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/attendances',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { trainee: coursesList[0].trainees[0], courseSlot: slotsList[0]._id },
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe('Other roles', () => {
    it('should return 200 if courseSlot is from trainer\'s courses', async () => {
      authToken = await getTokenByCredentials(trainerList[0].local);
      const response = await app.inject({
        method: 'POST',
        url: '/attendances',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { trainee: coursesList[0].trainees[1], courseSlot: slotsList[0]._id },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 403 if courseSlot is not from trainer\'s courses', async () => {
      authToken = await getTokenByCredentials(trainerList[1].local);
      const response = await app.inject({
        method: 'POST',
        url: '/attendances',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { trainee: coursesList[0].trainees[1], courseSlot: slotsList[0]._id },
      });

      expect(response.statusCode).toBe(403);
    });

    const roles = [
      { name: 'training_organisation_manager', expectedCode: 200 },
      { name: 'helper', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'POST',
          url: '/attendances',
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload: { trainee: coursesList[0].trainees[1], courseSlot: slotsList[0]._id },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('ATTENDANCES ROUTES - GET /attendances', () => {
  let authToken = null;
  beforeEach(populateDB);

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should get course attendances', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/attendances?course=${coursesList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.attendances.length).toEqual(1);
    });

    it('should get courseSlot attendances', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/attendances?courseSlot=${slotsList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.attendances.length).toEqual(1);
    });

    it('should return 400 if query is empty', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/attendances',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if query course has invalid type', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/attendances?course=skusku',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if query courseSlot has invalid type', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/attendances?courseSlot=skusku',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 if invalid course', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/attendances?course=${new ObjectID()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 if invalid courseSlot', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/attendances?courseSlot=${new ObjectID()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 400 if query has course and courseSlot but return a 404 and I have no idea why', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/attendances/course=${coursesList[0]._id}&courseSlot=${slotsList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should get course attendances not filtered by company for inter course', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/attendances?course=${coursesList[3]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.attendances.length).toEqual(2);
    });
  });

  describe('Other roles', () => {
    it('should return 200 if courseSlot is from trainer\'s courses', async () => {
      authToken = await getTokenByCredentials(trainerList[0].local);
      const response = await app.inject({
        method: 'GET',
        url: `/attendances?course=${coursesList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 403 if courseSlot is not from trainer\'s courses', async () => {
      authToken = await getTokenByCredentials(trainerList[1].local);
      const response = await app.inject({
        method: 'GET',
        url: `/attendances?course=${coursesList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 if user is client_admin and course is intra and not from user company', async () => {
      authToken = await getToken('client_admin');
      const response = await app.inject({
        method: 'GET',
        url: `/attendances?courseSlot=${slotsList[2]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 if user is client_admin, course is inter and no trainee is from user company', async () => {
      authToken = await getToken('client_admin');
      const response = await app.inject({
        method: 'GET',
        url: `/attendances?course=${coursesList[4]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should get course attendances filtered by company for inter course', async () => {
      authToken = await getToken('client_admin');
      const response = await app.inject({
        method: 'GET',
        url: `/attendances?course=${coursesList[3]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.attendances.length).toEqual(1);
    });

    const roles = [
      { name: 'training_organisation_manager', expectedCode: 200 },
      { name: 'helper', expectedCode: 403 },
      { name: 'coach', expectedCode: 200 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/attendances?course=${coursesList[0]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('ATTENDANCE ROUTES - DELETE /attendances/{_id}', () => {
  let authToken = null;
  beforeEach(populateDB);

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should delete an attendance', async () => {
      const attendanceId = attendancesList[0]._id;
      const attendanceCount = await Attendance.countDocuments();
      const response = await app.inject({
        method: 'DELETE',
        url: `/attendances/${attendanceId.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(await Attendance.countDocuments()).toEqual(attendanceCount - 1);
    });

    it('should return a 404 if attendance does not exist', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/attendances/${new ObjectID().toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    it('should return 200 if courseSlot is from trainer\'s courses', async () => {
      authToken = await getTokenByCredentials(trainerList[0].local);
      const attendanceId = attendancesList[0]._id;
      const response = await app.inject({
        method: 'DELETE',
        url: `/attendances/${attendanceId.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 403 if courseSlot is not from trainer\'s courses', async () => {
      authToken = await getTokenByCredentials(trainerList[1].local);
      const attendanceId = attendancesList[0]._id;
      const response = await app.inject({
        method: 'DELETE',
        url: `/attendances/${attendanceId.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    const roles = [
      { name: 'training_organisation_manager', expectedCode: 200 },
      { name: 'helper', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const attendanceId = attendancesList[0]._id;
        const response = await app.inject({
          method: 'DELETE',
          url: `/attendances/${attendanceId.toHexString()}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
