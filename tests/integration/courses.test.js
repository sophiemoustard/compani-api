const { expect } = require('expect');
const sinon = require('sinon');
const path = require('path');
const { ObjectId } = require('mongodb');
const os = require('os');
const omit = require('lodash/omit');
const pick = require('lodash/pick');
const get = require('lodash/get');
const app = require('../../server');
const Course = require('../../src/models/Course');
const CourseSlot = require('../../src/models/CourseSlot');
const drive = require('../../src/models/Google/Drive');
const CourseSmsHistory = require('../../src/models/CourseSmsHistory');
const CourseHistory = require('../../src/models/CourseHistory');
const {
  CONVOCATION,
  COURSE_SMS,
  TRAINEE_ADDITION,
  TRAINEE_DELETION,
  INTRA,
  INTER_B2B,
  OTHER,
  ESTIMATED_START_DATE_EDITION,
  COMPANY_ADDITION,
  COMPANY_DELETION,
} = require('../../src/helpers/constants');
const {
  populateDB,
  coursesList,
  subProgramsList,
  programsList,
  traineeWithoutCompany,
  traineeFromOtherCompany,
  traineeFromAuthCompanyWithFormationExpoToken,
  userCompanies,
  coachFromOtherCompany,
  traineeFormerlyInAuthCompany,
  traineeComingUpInAuthCompany,
  traineeFromAuthFormerlyInOther,
} = require('./seed/coursesSeed');
const { getToken, getTokenByCredentials } = require('./helpers/authentication');
const { otherCompany, authCompany, companyWithoutSubscription: thirdCompany } = require('../seed/authCompaniesSeed');
const {
  noRoleNoCompany,
  coach,
  trainer,
  clientAdmin,
  vendorAdmin,
  trainerAndCoach,
  noRole,
} = require('../seed/authUsersSeed');
const SmsHelper = require('../../src/helpers/sms');
const DocxHelper = require('../../src/helpers/docx');
const NotificationHelper = require('../../src/helpers/notifications');
const UtilsHelper = require('../../src/helpers/utils');
const translate = require('../../src/helpers/translate');
const UtilsMock = require('../utilsMock');
const { CompaniDate } = require('../../src/helpers/dates/companiDates');

const { language } = translate;

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('COURSES ROUTES - POST /courses', () => {
  let authToken;
  beforeEach(populateDB);

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should create inter_b2b course', async () => {
      const payload = {
        misc: 'course',
        type: INTER_B2B,
        subProgram: subProgramsList[0]._id,
        salesRepresentative: vendorAdmin._id,
        estimatedStartDate: '2022-05-31T08:00:00.000Z',
      };
      const coursesCountBefore = await Course.countDocuments({});

      const response = await app.inject({
        method: 'POST',
        url: '/courses',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      const createdCourseId = response.result.data.course._id;

      expect(response.statusCode).toBe(200);
      const coursesCountAfter = await Course.countDocuments({});
      expect(coursesCountAfter).toEqual(coursesCountBefore + 1);
      const courseSlotsCount = await CourseSlot
        .countDocuments({ course: createdCourseId, step: { $in: subProgramsList[0].steps } });
      expect(courseSlotsCount).toEqual(1);

      const courseHistory = await CourseHistory.countDocuments({
        course: createdCourseId,
        'update.estimatedStartDate.to': '2022-05-31T08:00:00.000Z',
        action: ESTIMATED_START_DATE_EDITION,
      });

      expect(courseHistory).toEqual(1);
    });

    it('should create intra course', async () => {
      const payload = {
        misc: 'course',
        type: INTRA,
        maxTrainees: 12,
        company: authCompany._id,
        subProgram: subProgramsList[0]._id,
        salesRepresentative: vendorAdmin._id,
        expectedBillsCount: 2,
      };
      const coursesCountBefore = await Course.countDocuments({});

      const response = await app.inject({
        method: 'POST',
        url: '/courses',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(200);
      const coursesCountAfter = await Course.countDocuments({});
      expect(coursesCountAfter).toEqual(coursesCountBefore + 1);
      const courseSlotsCount = await CourseSlot
        .countDocuments({ course: response.result.data.course._id, step: { $in: subProgramsList[0].steps } });
      expect(courseSlotsCount).toEqual(1);
    });

    it('should return 403 if invalid salesRepresentative', async () => {
      const payload = {
        misc: 'course',
        type: INTER_B2B,
        subProgram: subProgramsList[0]._id,
        salesRepresentative: clientAdmin._id,
      };
      const response = await app.inject({
        method: 'POST',
        url: '/courses',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 if invalid company', async () => {
      const payload = {
        misc: 'course',
        type: INTRA,
        company: new ObjectId(),
        maxTrainees: 12,
        subProgram: subProgramsList[0]._id,
        salesRepresentative: vendorAdmin._id,
        expectedBillsCount: 0,
      };
      const response = await app.inject({
        method: 'POST',
        url: '/courses',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 400 if invalid type', async () => {
      const payload = {
        misc: 'course',
        type: 'invalid type',
        subProgram: subProgramsList[0]._id,
        salesRepresentative: vendorAdmin._id,
      };

      const response = await app.inject({
        method: 'POST',
        url: '/courses',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if inter_b2b course and maxTrainees is in payload', async () => {
      const payload = {
        misc: 'course',
        type: INTER_B2B,
        maxTrainees: 10,
        subProgram: subProgramsList[0]._id,
        salesRepresentative: vendorAdmin._id,
        estimatedStartDate: '2022-05-31T08:00:00.000Z',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/courses',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if inter_b2b course and expectedBillsCount is in payload', async () => {
      const payload = {
        misc: 'course',
        type: INTER_B2B,
        expectedBillsCount: 2,
        subProgram: subProgramsList[0]._id,
        salesRepresentative: vendorAdmin._id,
        estimatedStartDate: '2022-05-31T08:00:00.000Z',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/courses',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if expectedBillsCount is lower than 0', async () => {
      const payload = {
        misc: 'course',
        type: INTRA,
        expectedBillsCount: -3,
        subProgram: subProgramsList[0]._id,
        salesRepresentative: vendorAdmin._id,
        estimatedStartDate: '2022-05-31T08:00:00.000Z',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/courses',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if expectedBillsCount is float', async () => {
      const payload = {
        misc: 'course',
        type: INTRA,
        expectedBillsCount: 3.2,
        subProgram: subProgramsList[0]._id,
        salesRepresentative: vendorAdmin._id,
        estimatedStartDate: '2022-05-31T08:00:00.000Z',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/courses',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(400);
    });

    const payload = {
      misc: 'course',
      company: authCompany._id,
      subProgram: subProgramsList[0]._id,
      type: INTRA,
      maxTrainees: 8,
      salesRepresentative: vendorAdmin._id,
      expectedBillsCount: 0,
    };
    ['company', 'subProgram', 'maxTrainees', 'expectedBillsCount'].forEach((param) => {
      it(`should return a 400 error if course is intra and '${param}' parameter is missing`, async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/courses',
          payload: omit({ ...payload }, param),
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(400);
      });
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'trainer', expectedCode: 403 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        const payload = {
          misc: 'course',
          type: INTRA,
          maxTrainees: 8,
          company: authCompany._id,
          subProgram: subProgramsList[0]._id,
          salesRepresentative: vendorAdmin._id,
          expectedBillsCount: 2,
        };
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'POST',
          url: '/courses',
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload,
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('COURSES ROUTES - GET /courses', () => {
  let authToken;
  beforeEach(populateDB);

  it('should return 200 as user is logged in (pedagogy mobile)', async () => {
    authToken = await getTokenByCredentials(noRole.local);

    const response = await app.inject({
      method: 'GET',
      url: '/courses?action=pedagogy&origin=mobile',
      headers: { 'x-access-token': authToken },
    });

    expect(response.statusCode).toBe(200);
    expect(response.result.data.courses.length).toBe(1);
  });

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should get all courses (ops webapp)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/courses?action=operations&origin=webapp',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.courses.length).toEqual(coursesList.length);

      const course =
         response.result.data.courses.find(c => UtilsHelper.areObjectIdsEquals(coursesList[3]._id, c._id));
      expect(course).toEqual(expect.objectContaining({
        misc: 'second team formation',
        type: INTRA,
        companies: [pick(otherCompany, ['_id', 'name'])],
        subProgram: expect.objectContaining({
          _id: expect.any(ObjectId),
          program: {
            _id: programsList[0]._id,
            name: programsList[0].name,
            subPrograms: [expect.any(ObjectId)],
          },
        }),
        trainer: pick(trainerAndCoach, ['_id', 'identity.firstname', 'identity.lastname']),
        slots: [{
          startDate: CompaniDate('2020-03-05T08:00:00.000Z').toDate(),
          endDate: CompaniDate('2020-03-05T10:00:00.000Z').toDate(),
          course: coursesList[3]._id,
          _id: expect.any(ObjectId),
        }],
        trainees: expect.arrayContaining([expect.objectContaining({
          _id: expect.any(ObjectId),
          company: expect.objectContaining(pick(otherCompany, ['_id', 'name'])),
        })]),
        slotsToPlan: [{ _id: expect.any(ObjectId), course: course._id }],
      }));
      expect(course.trainees[0].local).toBeUndefined();
      expect(course.trainees[0].refreshtoken).toBeUndefined();

      const archivedCourse = response.result.data.courses
        .find(c => UtilsHelper.areObjectIdsEquals(coursesList[14]._id, c._id));
      expect(archivedCourse.archivedAt).toEqual(CompaniDate('2021-01-01T00:00:00.000Z').toDate());
      expect(archivedCourse.estimatedStartDate).toEqual(CompaniDate('2020-11-03T10:00:00.000Z').toDate());
    });

    it('should get blended courses (ops webapp)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/courses?action=operations&origin=webapp&format=blended',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.courses.length).toEqual(17);
    });

    it('should get strictly e-learning courses (ops webapp)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/courses?action=operations&origin=webapp&format=strictly_e_learning',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.courses.length).toEqual(3);
    });

    it('should get all trainee courses (pedagogy webapp)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses?action=pedagogy&origin=webapp&trainee=${traineeFromAuthFormerlyInOther._id.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.courses.length).toEqual(4);
    });

    it('should return 400 if no action', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/courses?origin=mobile',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if no origin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/courses?action=operations',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 if trainee doesn\'t exist (pedagogy webapp)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses?action=pedagogy&origin=webapp&trainee=${new ObjectId()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 400 if no trainee (pedagogy webapp)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/courses?action=pedagogy&origin=webapp}',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if action is operations but with trainee', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses?action=operations&origin=webapp&trainee=${userCompanies[1].user.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if origin is mobile but with trainee', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses?action=pedagogy&origin=mobile&trainee=${userCompanies[1].user.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Other roles', () => {
    it('should get courses with a specific trainer (ops webapp)', async () => {
      authToken = await getToken('trainer');
      const response = await app.inject({
        method: 'GET',
        url: `/courses?action=operations&origin=webapp&trainer=${trainer._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.courses.length).toEqual(11);
    });

    it('should get trainer\'s course (ops mobile)', async () => {
      authToken = await getToken('trainer');
      const response = await app.inject({
        method: 'GET',
        url: `/courses?action=operations&origin=mobile&trainer=${trainer._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.courses.length).toEqual(11);

      const course =
         response.result.data.courses.find(c => UtilsHelper.areObjectIdsEquals(coursesList[2]._id, c._id));
      expect(course).toEqual(expect.objectContaining({
        misc: 'second session',
        companies: [pick(authCompany, ['_id', 'name'])],
        subProgram: expect.objectContaining({
          _id: expect.any(ObjectId),
          program: {
            _id: programsList[0]._id,
            name: programsList[0].name,
            image: programsList[0].image,
            description: programsList[0].description,
            subPrograms: [expect.any(ObjectId)],
          },
        }),
        slots: [{
          startDate: CompaniDate('2020-03-04T08:00:00.000Z').toDate(),
          endDate: CompaniDate('2020-03-04T10:00:00.000Z').toDate(),
          course: coursesList[2]._id,
          step: {
            _id: expect.any(ObjectId),
            type: 'on_site',
          },
          _id: expect.any(ObjectId),
        }],
        slotsToPlan: [
          { _id: expect.any(ObjectId), course: course._id },
          { _id: expect.any(ObjectId), course: course._id },
        ],
      }));
      expect(course.trainer).toBeUndefined();
      expect(course.trainees).toBeUndefined();
      expect(course.salesRepresentative).toBeUndefined();
    });

    it('should return 400 if no trainer (ops mobile)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/courses?action=operations&origin=mobile',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should get courses for a specific company (ops webapp)', async () => {
      authToken = await getToken('coach');
      const response = await app.inject({
        method: 'GET',
        url: `/courses?action=operations&origin=webapp&company=${authCompany._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.courses.length).toEqual(11);
    });

    it('should return 200 if coach and same company (pedagogy webapp)', async () => {
      authToken = await getToken('coach');
      const url = `/courses?action=pedagogy&origin=webapp&trainee=${traineeFromAuthFormerlyInOther._id.toHexString()}`
        + `&company=${authCompany._id.toHexString()}`;

      const response = await app.inject({
        method: 'GET',
        url,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);

      const resultCourseIds = response.result.data.courses.map(course => course._id);
      expect(resultCourseIds.length).toBe(2);
      [coursesList[7]._id, coursesList[8]._id]
        .forEach(courseId => expect(UtilsHelper.doesArrayIncludeId(resultCourseIds, courseId)).toBeTruthy());
    });

    it('should return 200 if coach and trainer and same company (pedagogy webapp)', async () => {
      authToken = await getTokenByCredentials(trainerAndCoach.local);
      const url = `/courses?action=pedagogy&origin=webapp&trainee=${userCompanies[2].user.toHexString()}`
        + `&company=${authCompany._id.toHexString()}`;

      const response = await app.inject({
        method: 'GET',
        url,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 403 if client admin and different company (pedagogy webapp)', async () => {
      authToken = await getToken('client_admin');
      const response = await app.inject({
        method: 'GET',
        url: `/courses?action=pedagogy&origin=webapp&trainee=${userCompanies[1].user.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'trainer', expectedCode: 403 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}
       requesting all courses (ops webapp)`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: '/courses?action=operations&origin=webapp',
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('COURSES ROUTES - GET /courses/{_id}', () => {
  let authToken;
  const courseFromAuthCompanyIntra = coursesList[0];
  const courseFromAuthCompanyInterB2b = coursesList[4];
  beforeEach(populateDB);

  describe('TRAINING_ORGANISTION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should get intra course (ops webapp)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${courseFromAuthCompanyIntra._id}?action=operations&origin=webapp`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.course._id.toHexString()).toBe(courseFromAuthCompanyIntra._id.toHexString());
    });

    it('should get inter b2b course with all trainees (ops webapp)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${courseFromAuthCompanyInterB2b._id}?action=operations&origin=webapp`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.course._id.toHexString()).toBe(courseFromAuthCompanyInterB2b._id.toHexString());
    });
  });

  describe('COACH', () => {
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    it('should get inter b2b course (ops webapp)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${courseFromAuthCompanyInterB2b._id}?action=operations&origin=webapp`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.course._id.toHexString()).toBe(courseFromAuthCompanyInterB2b._id.toHexString());
    });

    it('should return elearning course with no access rule (ops webapp)',
      async () => {
        const response = await app.inject({
          method: 'GET',
          url: `/courses/${coursesList[6]._id}?action=operations&origin=webapp`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(200);
      });

    it('should return course if course is eLearning and has accessRules that contain user company (ops webapp)',
      async () => {
        const response = await app.inject({
          method: 'GET',
          url: `/courses/${coursesList[8]._id}?action=operations&origin=webapp`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(200);
      });

    it('should return 403 if course is eLearning and has accessRules that doesn\'t contain user company (ops webapp)',
      async () => {
        const response = await app.inject({
          method: 'GET',
          url: `/courses/${coursesList[11]._id}?action=operations&origin=webapp`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(403);
      });

    it('should return 403 if course is intra and user company is not course company (ops webapp)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${coursesList[1]._id}?action=operations&origin=webapp`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 if course is inter_b2b and no trainee is from user company (ops webapp)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${coursesList[10]._id}?action=operations&origin=webapp`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 400 if no action', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${coursesList[10]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if operation and no origin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${coursesList[10]._id}?action=operations`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if pedagogy and origin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${coursesList[8]._id}?action=pedagogy&origin=webapp`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('TRAINER', () => {
    beforeEach(async () => {
      authToken = await getToken('trainer');
    });

    it('should return 200 if user is trainer and is course\'s trainer (ops webapp)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${courseFromAuthCompanyInterB2b._id}?action=operations&origin=webapp`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 200 if user is trainer and is course\'s trainer (ops mobile)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${courseFromAuthCompanyInterB2b._id}?action=operations&origin=mobile`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 200 if user is trainer and is course\'s trainer (pedagogy)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${courseFromAuthCompanyInterB2b._id}?action=pedagogy`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 403 if user is trainer and isn\'t course\'s trainer', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${coursesList[10]._id}?action=operations&origin=webapp`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('Other roles', () => {
    const roles = [{ name: 'helper', expectedCode: 403 }, { name: 'planning_referent', expectedCode: 403 }];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);

        const response = await app.inject({
          method: 'GET',
          url: `/courses/${courseFromAuthCompanyInterB2b._id}?action=operations&origin=webapp`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });

    it('should get course if trainee (pedagogy)', async () => {
      authToken = await getTokenByCredentials(noRole.local);
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${coursesList[5]._id.toHexString()}?action=pedagogy`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.course._id).toEqual(coursesList[5]._id);
    });

    it('should not get course if not trainee', async () => {
      authToken = await getTokenByCredentials(noRole.local);
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${coursesList[0]._id.toHexString()}?action=pedagogy`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should get course if has access authorization (pedagogy)', async () => {
      authToken = await getTokenByCredentials(traineeFromOtherCompany.local);
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${coursesList[11]._id.toHexString()}?action=pedagogy`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should not get course if has not access authorization', async () => {
      authToken = await getTokenByCredentials(traineeFromOtherCompany.local);
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${coursesList[8]._id.toHexString()}?action=pedagogy`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });
  });
});

describe('COURSES ROUTES - GET /courses/{_id}/follow-up', () => {
  let authToken;
  const intraCourseFromAuthCompany = coursesList[0];
  beforeEach(populateDB);

  describe('TRANING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should get course with follow up', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${coursesList[0]._id.toHexString()}/follow-up`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.followUp._id.toHexString()).toBe(intraCourseFromAuthCompany._id.toHexString());
    });
  });

  describe('COACH', () => {
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    it('should get course with follow up', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${coursesList[0]._id.toHexString()}/follow-up?company=${authCompany._id.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 403 if user company is not query company', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${coursesList[0]._id.toHexString()}/follow-up?company=${otherCompany._id.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('TRAINER', () => {
    beforeEach(async () => {
      authToken = await getToken('trainer');
    });

    it('should return 200 as user trainer and course trainer', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${coursesList[0]._id.toHexString()}/follow-up`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(200);
    });

    it('should return 403 as user trainer but not course trainer', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${coursesList[1]._id.toHexString()}/follow-up`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(403);
    });
  });

  describe('Other roles', () => {
    it('should return 403 if user has no company and query has no company', async () => {
      authToken = await getToken('auxiliary_without_company');

      const response = await app.inject({
        method: 'GET',
        url: `/courses/${coursesList[0]._id.toHexString()}/follow-up`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 200 as user is coach and trainer, but not course trainer', async () => {
      authToken = await getTokenByCredentials(trainerAndCoach.local);
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${coursesList[0]._id.toHexString()}/follow-up?company=${authCompany._id.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(200);
    });

    const roles = [{ name: 'helper', expectedCode: 403 }, { name: 'planning_referent', expectedCode: 403 }];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);

        const response = await app.inject({
          method: 'GET',
          url: `/courses/${coursesList[0]._id.toHexString()}/follow-up?company=${authCompany._id.toHexString()}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('COURSES ROUTES - GET /courses/{_id}/activities', () => {
  let authToken;
  beforeEach(populateDB);

  describe('TRAINER', () => {
    beforeEach(async () => {
      authToken = await getToken('trainer');
    });

    it('should get questionnaire answers', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${coursesList[0]._id.toHexString()}/activities`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.questionnaireAnswers.length).toBe(1);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);

        const response = await app.inject({
          method: 'GET',
          url: `/courses/${coursesList[0]._id.toHexString()}/activities`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('COURSES ROUTES - GET /courses/{_id}/questionnaires', () => {
  let authToken;
  beforeEach(populateDB);

  describe('TRAINER', () => {
    beforeEach(async () => {
      authToken = await getToken('trainer');
    });

    it('should get questionnaires list', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${coursesList[0]._id.toHexString()}/questionnaires`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.questionnaires.length).toBe(1);
    });

    it('should return 404 if course doesn\'t exist', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${new ObjectId()}/questionnaires`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 if course is strictly e-learning', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${coursesList[8]._id.toHexString()}/questionnaires`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 as user is trainer, but not course trainer', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${coursesList[1]._id.toHexString()}/questionnaires`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);

        const response = await app.inject({
          method: 'GET',
          url: `/courses/${coursesList[0]._id.toHexString()}/questionnaires`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('COURSES ROUTES - PUT /courses/{_id}', () => {
  let authToken;
  const courseIdFromAuthCompany = coursesList[0]._id;
  const archivedCourse = coursesList[14]._id;

  beforeEach(populateDB);

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should update course', async () => {
      const payload = {
        misc: 'new name',
        trainer: trainerAndCoach._id,
        contact: trainerAndCoach._id,
        estimatedStartDate: '2022-05-31T08:00:00.000Z',
        maxTrainees: 12,
        expectedBillsCount: 3,
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${coursesList[17]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(200);

      const courseUpdated = await Course.countDocuments({ _id: coursesList[17]._id, ...payload });
      expect(courseUpdated).toEqual(1);

      const historyCreated = await CourseHistory.countDocuments({
        course: coursesList[17]._id,
        action: ESTIMATED_START_DATE_EDITION,
        update: { estimatedStartDate: { from: '', to: '2022-05-31T08:00:00.000Z' } },
      });
      expect(historyCreated).toEqual(1);
    });

    it('should update company representative and set as contact directly for INTRA course', async () => {
      const payload = { companyRepresentative: coachFromOtherCompany._id, contact: coachFromOtherCompany._id };
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${coursesList[3]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(200);

      const course = await Course.countDocuments({ _id: coursesList[3]._id, ...payload }).lean();
      expect(course).toEqual(1);
    });

    it('should return 400 if try to remove estimated start date', async () => {
      const payload = { estimatedStartDate: '' };
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${coursesList[4]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 if course doesn\'t exist', async () => {
      const payload = { maxTrainees: 12 };
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${new ObjectId()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(404);
    });

    it('should set expectedBillsCount if not lower than number of validated bills', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${coursesList[1]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { expectedBillsCount: 1 },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should allow to set expectedBillsCount to 0 if no bill exist', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${coursesList[17]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { expectedBillsCount: 0 },
      });

      expect(response.statusCode).toBe(200);
    });

    const payloads = [
      { misc: 'new name' },
      { trainer: new ObjectId() },
      { contact: vendorAdmin._id },
      { salesRepresentative: new ObjectId() },
      { maxTrainees: 15 },
      { expectedBillsCount: 10 },
    ];
    payloads.forEach((payload) => {
      it(`should return 403 if course is archived (update ${Object.keys(payload)})`, async () => {
        const response = await app.inject({
          method: 'PUT',
          url: `/courses/${archivedCourse}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload,
        });

        expect(response.statusCode).toBe(403);
      });
    });

    it('should return 403 if invalid salesRepresentative', async () => {
      const payload = { salesRepresentative: clientAdmin._id };
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${courseIdFromAuthCompany}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 if invalid trainer', async () => {
      const payload = { trainer: clientAdmin._id };
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${courseIdFromAuthCompany}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 if trainer is trainee', async () => {
      const payload = { trainer: vendorAdmin._id };
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${courseIdFromAuthCompany}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 if invalid companyRepresentative', async () => {
      const payload = { companyRepresentative: vendorAdmin._id };
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${courseIdFromAuthCompany}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 404 if companyRepresentative has wrong company', async () => {
      const courseIdFromOtherCompany = coursesList[1]._id;
      const payload = { companyRepresentative: coach._id };
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${courseIdFromOtherCompany}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 403 if maxTrainees smaller than registered trainees', async () => {
      const payload = { maxTrainees: 4 };
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${coursesList[2]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 if contact is not one of interlocutors', async () => {
      const payload = { contact: new ObjectId() };
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${coursesList[4]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 if contact is one of interlocutors but interlocutor is changing', async () => {
      const payload = { trainer: trainerAndCoach._id, contact: trainer._id };
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${coursesList[4]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 if trying to archive course without trainee', async () => {
      const payload = { archivedAt: CompaniDate('2020-03-25T09:00:00.000Z').toDate() };
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${coursesList[13]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(403);

      const course = await Course.findById(coursesList[13]._id)
        .populate({ path: 'slots', select: 'startDate endDate' })
        .populate({ path: 'slotsToPlan' })
        .lean();

      expect(course.trainees.length).toBeFalsy();
      expect(course.slots.length).toBeTruthy();
      expect(course.slotsToPlan.length).toBe(0);
      expect(course.format).toBe('blended');
      expect(course.slots.every(slot => CompaniDate(slot.endDate).isBefore(payload.archivedAt))).toBeTruthy();
    });

    it('should return 403 if trying to archive course without slot', async () => {
      const payload = { archivedAt: CompaniDate('2020-03-25T09:00:00.000Z').toDate() };
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${coursesList[4]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(403);

      const course = await Course.findById(coursesList[4]._id)
        .populate({ path: 'slots', select: 'startDate endDate' })
        .populate({ path: 'slotsToPlan' })
        .lean();

      expect(course.trainees.length).toBeTruthy();
      expect(course.slots.length).toBeFalsy();
      expect(course.slotsToPlan.length).toBe(0);
      expect(course.format).toBe('blended');
      expect(course.slots.every(slot => CompaniDate(slot.endDate).isBefore(payload.archivedAt))).toBeTruthy();
    });

    it('should return 403 if trying to archive course with slot to plan', async () => {
      const payload = { archivedAt: CompaniDate('2020-03-25T09:00:00.000Z').toDate() };
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${coursesList[7]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(403);

      const course = await Course.findById(coursesList[7]._id)
        .populate({ path: 'slots', select: 'startDate endDate' })
        .populate({ path: 'slotsToPlan' })
        .lean();

      expect(course.trainees.length).toBeTruthy();
      expect(course.slots.length).toBeTruthy();
      expect(course.slotsToPlan.length).toBeTruthy();
      expect(course.format).toBe('blended');
      expect(course.slots.every(slot => CompaniDate(slot.endDate).isBefore(payload.archivedAt))).toBeTruthy();
    });

    it('should return 403 if trying to archive a not blended course', async () => {
      const payload = { archivedAt: CompaniDate('2020-03-25T09:00:00.000Z').toDate() };
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${coursesList[8]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(403);

      const course = await Course.findById(coursesList[8]._id)
        .populate({ path: 'slots', select: 'startDate endDate' })
        .populate({ path: 'slotsToPlan' })
        .lean();

      expect(course.trainees.length).toBeTruthy();
      expect(course.slots.length).toBeTruthy();
      expect(course.slotsToPlan.length).toBe(0);
      expect(course.format).toBe('strictly_e_learning');
      expect(course.slots.every(slot => CompaniDate(slot.endDate).isBefore(payload.archivedAt))).toBeTruthy();
    });

    it('should return 403 if trying to archive a course in progress', async () => {
      const payload = { archivedAt: CompaniDate('2020-01-10T00:00:00.000Z').toDate() };
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${coursesList[5]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(403);

      const course = await Course.findById(coursesList[5]._id)
        .populate({ path: 'slots', select: 'startDate endDate' })
        .populate({ path: 'slotsToPlan' })
        .lean();

      expect(course.trainees.length).toBeTruthy();
      expect(course.slots.length).toBeTruthy();
      expect(course.slotsToPlan.length).toBe(0);
      expect(course.format).toBe('blended');
      expect(course.slots.every(slot => CompaniDate(slot.endDate).isBefore(payload.archivedAt))).toBeFalsy();
    });

    it('should return 403 if try to add estimated start date to course with slots', async () => {
      const payload = {
        estimatedStartDate: '2022-05-31T08:00:00',
      };
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${courseIdFromAuthCompany}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 400 if trying to set maxTrainees for inter b2b course', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${coursesList[4]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { maxTrainees: 14 },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if trying to set expectedBillsCount for inter b2b course', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${coursesList[4]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { expectedBillsCount: 14 },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if expectedBillsCount is lower than 0', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${coursesList[17]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { expectedBillsCount: -14 },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if expectedBillsCount is float', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${coursesList[17]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { expectedBillsCount: 14.3 },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 409 if trying to set expectedBillsCount lower than the number of validated bills', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${coursesList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { expectedBillsCount: 1 },
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}, requesting on his company`, async () => {
        const payload = { misc: 'new name' };
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'PUT',
          url: `/courses/${courseIdFromAuthCompany}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload,
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });

    it('should return 200 as user is the course trainer', async () => {
      authToken = await getToken('trainer');
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${courseIdFromAuthCompany}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { misc: 'new name' },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 403 as user is course trainer but try to update salesRepresentative', async () => {
      authToken = await getToken('trainer');
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${courseIdFromAuthCompany}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { salesRepresentative: vendorAdmin._id },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 as user is course trainer but try to update maxTrainees', async () => {
      authToken = await getToken('trainer');
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${courseIdFromAuthCompany}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { maxTrainees: 9 },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 as user is course trainer but try to update expectedBillsCount', async () => {
      authToken = await getToken('trainer');
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${courseIdFromAuthCompany}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { expectedBillsCount: 25 },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 as user is trainer if not one of his courses', async () => {
      authToken = await getToken('trainer');
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${coursesList[1]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { misc: 'new name' },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should update course as user is coach in the company of the course', async () => {
      authToken = await getToken('coach');

      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${courseIdFromAuthCompany}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { misc: 'new name' },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should not update course as user is coach but try to update trainer', async () => {
      authToken = await getToken('coach');

      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${courseIdFromAuthCompany}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { trainer: new ObjectId() },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 as user is client_admin and try to update estimated start date', async () => {
      authToken = await getToken('client_admin');

      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${courseIdFromAuthCompany}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { estimatedStartDate: '2022-01-01T08:00:00' },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 as user is client_admin and try to update expectedBillsCount', async () => {
      authToken = await getToken('client_admin');

      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${courseIdFromAuthCompany}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { expectedBillsCount: 9 },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 as user is trainer and try to update estimated start date', async () => {
      authToken = await getToken('trainer');

      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${courseIdFromAuthCompany}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { estimatedStartDate: '2022-01-01T08:00:00' },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 if try to update contact and company representative from other company', async () => {
      authToken = await getToken('trainer');

      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${courseIdFromAuthCompany}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { contact: clientAdmin._id, companyRepresentative: clientAdmin._id },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 as user is client_admin but not in the company of the course', async () => {
      authToken = await getToken('client_admin');

      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${coursesList[1]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { misc: 'new name', trainer: new ObjectId() },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 as user is client_admin and try to update maxTrainees', async () => {
      authToken = await getToken('client_admin');
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${courseIdFromAuthCompany}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { maxTrainees: 9 },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 200 if coach try to update contact and company representative which is contact', async () => {
      authToken = await getToken('coach');

      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${courseIdFromAuthCompany}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { contact: clientAdmin._id, companyRepresentative: clientAdmin._id },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 403 if coach try to update contact and company representative which is not contact', async () => {
      authToken = await getToken('coach');

      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${coursesList[2]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { contact: clientAdmin._id, companyRepresentative: clientAdmin._id },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 if coach try to update contact only', async () => {
      authToken = await getToken('coach');

      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${courseIdFromAuthCompany}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { contact: vendorAdmin._id },
      });

      expect(response.statusCode).toBe(403);
    });
  });
});

describe('COURSES ROUTES - DELETE /courses/{_id}', () => {
  let authToken;
  beforeEach(populateDB);

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should delete course', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/courses/${coursesList[6]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const courseCount = await Course.countDocuments({ _id: coursesList[6]._id });
      expect(courseCount).toBe(0);
    });

    it('should delete course with slots to plan', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/courses/${coursesList[16]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const courseCount = await Course.countDocuments({ _id: coursesList[16]._id });
      expect(courseCount).toBe(0);
      const slotsCount = await CourseSlot.countDocuments({ course: coursesList[16]._id });
      expect(slotsCount).toBe(0);
      const historiesCount = await CourseHistory.countDocuments({ course: coursesList[16]._id });
      expect(historiesCount).toBe(0);
    });

    it('should return 404 if course does not exist', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/courses/${new ObjectId()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 403 as course has trainees', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/courses/${coursesList[4]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 as course has slots', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/courses/${coursesList[5]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should not delete course if billed', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/courses/${coursesList[15]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
      const courseCount = await Course.countDocuments({ _id: coursesList[14]._id });
      expect(courseCount).toBe(1);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'trainer', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}, requesting on his company`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'DELETE',
          url: `/courses/${coursesList[6]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('COURSES ROUTES - POST /courses/{_id}/sms', () => {
  let authToken;
  const courseIdFromAuthCompany = coursesList[2]._id;
  const courseIdFromOtherCompany = coursesList[1]._id;
  const archivedCourseId = coursesList[14]._id;
  const courseIdWithoutReceiver = coursesList[7]._id;
  let SmsHelperStub;
  const payload = { content: 'Ceci est un test', type: CONVOCATION };

  beforeEach(populateDB);
  beforeEach(async () => {
    SmsHelperStub = sinon.stub(SmsHelper, 'send');
    UtilsMock.mockCurrentDate('2020-03-03T15:00:00.000Z');
  });
  afterEach(() => {
    SmsHelperStub.restore();
    UtilsMock.unmockCurrentDate();
  });

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should send a SMS to user from compani', async () => {
      SmsHelperStub.returns('SMS SENT !');
      const smsHistoryBefore = await CourseSmsHistory.countDocuments({ course: courseIdFromAuthCompany });

      const response = await app.inject({
        method: 'POST',
        url: `/courses/${courseIdFromAuthCompany}/sms`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const smsHistoryAfter = await CourseSmsHistory.countDocuments({ course: courseIdFromAuthCompany });
      expect(smsHistoryAfter).toEqual(smsHistoryBefore + 1);
      sinon.assert.calledWithExactly(
        SmsHelperStub,
        {
          recipient: `+33${coach.contact.phone.substring(1)}`,
          sender: 'Compani',
          content: payload.content,
          tag: COURSE_SMS,
        }
      );
    });

    it('should send a sms if type is other and course is finished', async () => {
      SmsHelperStub.returns('SMS SENT !');
      const smsHistoryBefore = await CourseSmsHistory.countDocuments({ course: courseIdFromAuthCompany });

      const response = await app.inject({
        method: 'POST',
        url: `/courses/${courseIdFromAuthCompany}/sms`,
        payload: { content: 'test', type: OTHER },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const smsHistoryAfter = await CourseSmsHistory.countDocuments({ course: courseIdFromAuthCompany });
      expect(smsHistoryAfter).toEqual(smsHistoryBefore + 1);
      sinon.assert.calledWithExactly(
        SmsHelperStub,
        {
          recipient: `+33${coach.contact.phone.substring(1)}`,
          sender: 'Compani',
          content: 'test',
          tag: COURSE_SMS,
        }
      );
    });

    it('should return a 200 if course is archived and type is other', async () => {
      const smsHistoryBefore = await CourseSmsHistory.countDocuments({ course: archivedCourseId });

      const response = await app.inject({
        method: 'POST',
        url: `/courses/${archivedCourseId}/sms`,
        payload: { content: 'Ceci est un test', type: OTHER },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);

      const courseIsArchived = !!await Course.countDocuments({ _id: archivedCourseId }, { archivedAt: 1 });
      expect(courseIsArchived).toBeTruthy();

      const smsHistoryAfter = await CourseSmsHistory.countDocuments({ course: archivedCourseId });
      expect(smsHistoryAfter).toEqual(smsHistoryBefore + 1);
      sinon.assert.calledWithExactly(
        SmsHelperStub,
        {
          recipient: `+33${coach.contact.phone.substring(1)}`,
          sender: 'Compani',
          content: 'Ceci est un test',
          tag: COURSE_SMS,
        }
      );
    });

    it('should return a 400 error if type is invalid', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/courses/${courseIdFromAuthCompany}/sms`,
        payload: { ...payload, type: 'qwert' },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
      sinon.assert.notCalled(SmsHelperStub);
    });

    it('should return 404 if course doesn\'t exist', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/courses/${new ObjectId()}/sms`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 403 if course has no slot to come and type is not other', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/courses/${coursesList[0]._id}/sms`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);

      const course = await Course.findById(coursesList[0]._id)
        .populate({ path: 'slots', select: 'startDate endDate' })
        .populate({ path: 'slotsToPlan' })
        .populate({ path: 'trainees', select: 'contact.phone' })
        .lean();

      const hasSlotToCome = course.slots && course.slots.some(slot => CompaniDate().isBefore(slot.startDate));
      const hasReceiver = course.trainees && course.trainees.some(trainee => get(trainee, 'contact.phone'));
      expect(hasSlotToCome).toBeFalsy();
      expect(hasReceiver).toBeTruthy();

      sinon.assert.notCalled(SmsHelperStub);
      UtilsMock.unmockCurrentDate();
    });

    it('should return a 403 if course is started and type is convocation', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/courses/${courseIdFromOtherCompany}/sms`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);

      const course = await Course.findById(courseIdFromOtherCompany)
        .populate({ path: 'slots', select: 'startDate endDate' })
        .populate({ path: 'slotsToPlan' })
        .populate({ path: 'trainees', select: 'contact.phone' })
        .lean();

      const IsStartedAndHasSlotToCome = course.slots.some(slot => CompaniDate().isAfter(slot.endDate)) &&
        course.slots.some(slot => CompaniDate().isBefore(slot.startDate));
      const hasReceiver = course.trainees && course.trainees.some(trainee => get(trainee, 'contact.phone'));
      expect(IsStartedAndHasSlotToCome).toBeTruthy();
      expect(hasReceiver).toBeTruthy();

      sinon.assert.notCalled(SmsHelperStub);
      UtilsMock.unmockCurrentDate();
    });

    it('should return a 403 if sms have no receiver', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/courses/${courseIdWithoutReceiver}/sms`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);

      const course = await Course.findById(courseIdWithoutReceiver)
        .populate({ path: 'slots', select: 'startDate endDate' })
        .populate({ path: 'slotsToPlan' })
        .populate({ path: 'trainees', select: 'contact.phone' })
        .lean();

      const hasSlotToCome = course.slots && course.slots.some(slot => CompaniDate().isBefore(slot.startDate));
      const hasReceiver = course.trainees && course.trainees.some(trainee => get(trainee, 'contact.phone'));
      expect(hasSlotToCome).toBeTruthy();
      expect(hasReceiver).toBeFalsy();

      sinon.assert.notCalled(SmsHelperStub);
    });

    ['content', 'type'].forEach((param) => {
      it(`should return a 400 error if missing ${param} parameter`, async () => {
        const response = await app.inject({
          method: 'POST',
          url: `/courses/${courseIdFromAuthCompany}/sms`,
          payload: omit(payload, param),
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(400);
        sinon.assert.notCalled(SmsHelperStub);
      });
    });
  });

  describe('OTHER ROLES', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'coach', expectedCode: 200 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}, requesting on his company`, async () => {
        SmsHelperStub.returns('SMS SENT !');
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'POST',
          url: `/courses/${courseIdFromAuthCompany}/sms`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload,
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });

    it('should return 200 as user is the course trainer', async () => {
      SmsHelperStub.returns('SMS SENT !');
      authToken = await getTokenByCredentials(trainer.local);
      const response = await app.inject({
        method: 'POST',
        url: `/courses/${courseIdFromAuthCompany}/sms`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 403 as user is trainer if not one of his courses', async () => {
      SmsHelperStub.returns('SMS SENT !');
      authToken = await getToken('trainer');
      const response = await app.inject({
        method: 'POST',
        url: `/courses/${coursesList[1]._id}/sms`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 as user is client_admin requesting on an other company', async () => {
      SmsHelperStub.returns('SMS SENT !');
      authToken = await getToken('client_admin');
      const response = await app.inject({
        method: 'POST',
        url: `/courses/${courseIdFromOtherCompany}/sms`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(403);
    });
  });
});

describe('COURSES ROUTES - GET /courses/{_id}/sms', () => {
  let authToken;
  const courseIdFromAuthCompany = coursesList[0]._id;
  const courseIdFromOtherCompany = coursesList[1]._id;

  beforeEach(populateDB);

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should get SMS from course', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${courseIdFromAuthCompany}/sms`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.sms.every(sms => UtilsHelper.areObjectIdsEquals(sms.course, courseIdFromAuthCompany)))
        .toBeTruthy();
    });

    it('should return a 404 error if course does not exist', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${new ObjectId()}/sms`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('OTHER ROLES', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'coach', expectedCode: 200 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}, requesting on his company`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/courses/${courseIdFromAuthCompany}/sms`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });

    it('should return 403 as user is trainer if not one of his courses', async () => {
      authToken = await getToken('trainer');
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${coursesList[1]._id}/sms`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return a 200 as user is course trainer', async () => {
      authToken = await getTokenByCredentials(trainer.local);
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${courseIdFromAuthCompany}/sms`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 403 as user is client_admin requesting on an other company', async () => {
      authToken = await getToken('client_admin');
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${courseIdFromOtherCompany}/sms`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });
  });
});

describe('COURSES ROUTES - PUT /courses/{_id}/trainees', () => {
  let authToken;
  let sendNotificationToUser;
  const intraCourseIdFromAuthCompany = coursesList[0]._id;
  const archivedCourse = coursesList[14]._id;
  const intraCourseIdFromOtherCompany = coursesList[1]._id;
  const intraCourseIdWithTrainee = coursesList[2]._id;
  const interb2bCourseIdFromAuthCompany = coursesList[4]._id;
  const interb2bCourseIdFromOtherCompany = coursesList[5]._id;

  beforeEach(populateDB);

  beforeEach(() => {
    sendNotificationToUser = sinon.stub(NotificationHelper, 'sendNotificationToUser');
  });
  afterEach(() => {
    sendNotificationToUser.restore();
  });

  describe('TRAINING_ORGANISATION_MANAGER intra', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should add existing user to course trainees', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${intraCourseIdFromAuthCompany}/trainees`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { trainee: traineeFromAuthCompanyWithFormationExpoToken._id },
      });

      expect(response.statusCode).toBe(200);

      const courseHistory = await CourseHistory.countDocuments({
        course: intraCourseIdFromAuthCompany,
        trainee: traineeFromAuthCompanyWithFormationExpoToken._id,
        action: TRAINEE_ADDITION,
      });
      expect(courseHistory).toEqual(1);

      const course = await Course.countDocuments({
        _id: intraCourseIdFromAuthCompany,
        trainees: traineeFromAuthCompanyWithFormationExpoToken._id,
      });
      expect(course).toEqual(1);
    });

    it('should return 404 if course doesn\'t exist', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${new ObjectId()}/trainees`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { trainee: traineeFromAuthCompanyWithFormationExpoToken._id },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 403 if course is archived', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${archivedCourse}/trainees`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { trainee: traineeFromAuthCompanyWithFormationExpoToken._id },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return a 403 if course has already reached max trainees', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${coursesList[3]._id}/trainees`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { trainee: traineeFromAuthCompanyWithFormationExpoToken._id },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 404 if user is no longer in company', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${intraCourseIdFromAuthCompany}/trainees`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { trainee: traineeFormerlyInAuthCompany._id },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 if user is not yet in company', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${intraCourseIdFromAuthCompany}/trainees`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { trainee: traineeComingUpInAuthCompany._id },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 404 if user is not from the course company', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${intraCourseIdFromOtherCompany}/trainees`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { trainee: traineeFromAuthCompanyWithFormationExpoToken._id },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 404 if user is not from course companies', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${interb2bCourseIdFromOtherCompany}/trainees`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { trainee: traineeFromAuthCompanyWithFormationExpoToken._id },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 403 if user is already course trainer', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${intraCourseIdWithTrainee}/trainees`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { trainee: trainer._id },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return a 409 if user is already registered to course', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${intraCourseIdWithTrainee}/trainees`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { trainee: traineeFromAuthCompanyWithFormationExpoToken._id },
      });

      expect(response.statusCode).toBe(409);
    });

    it('should return a 400 if trainee is missing in payload', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${intraCourseIdFromAuthCompany}/trainees`,
        payload: {},
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('TRAINING_ORGANISATION_MANAGER inter_b2b', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should add user to inter b2b course', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${interb2bCourseIdFromAuthCompany}/trainees`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { trainee: traineeFromAuthCompanyWithFormationExpoToken._id },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return a 403 if trainee has no company', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${interb2bCourseIdFromAuthCompany}/trainees`,
        payload: { trainee: traineeWithoutCompany._id },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'coach', expectedCode: 200 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}, requesting on his company`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'PUT',
          url: `/courses/${intraCourseIdFromAuthCompany}/trainees`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload: { trainee: traineeFromAuthCompanyWithFormationExpoToken._id },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });

    it('should return 403 as user is trainer but not of this course', async () => {
      authToken = await getToken('trainer');
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${coursesList[3]._id}/trainees`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { trainee: coachFromOtherCompany._id },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return a 403 as user is inter b2b course trainer', async () => {
      authToken = await getToken('trainer');
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${interb2bCourseIdFromAuthCompany}/trainees`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { trainee: traineeFromAuthCompanyWithFormationExpoToken._id },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return a 200 as user is intra course trainer', async () => {
      authToken = await getToken('trainer');
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${intraCourseIdFromAuthCompany}/trainees`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { trainee: traineeFromAuthCompanyWithFormationExpoToken._id },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 403 as user is client_admin requesting on an other company', async () => {
      authToken = await getToken('client_admin');
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${intraCourseIdFromOtherCompany}/trainees`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { trainee: traineeFromAuthCompanyWithFormationExpoToken._id },
      });

      expect(response.statusCode).toBe(403);
    });
  });
});

describe('COURSES ROUTES - POST /courses/{_id}/register-e-learning', () => {
  let authToken;

  beforeEach(populateDB);

  describe('Logged user', () => {
    beforeEach(async () => {
      authToken = await getTokenByCredentials(noRoleNoCompany.local);
    });

    it('should add trainee to e-learning course', async () => {
      const course = coursesList[6];
      const response = await app.inject({
        method: 'POST',
        url: `/courses/${course._id}/register-e-learning`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      const courseUpdated = await Course.countDocuments({ _id: course._id, trainees: noRoleNoCompany._id });
      expect(courseUpdated).toEqual(1);
    });

    it('should return 404 if course does not exist', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/courses/${new ObjectId()}/register-e-learning`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 403 if course is not strictly e learning', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/courses/${coursesList[0]._id}/register-e-learning`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 if trainee already suscribed to course', async () => {
      authToken = await getTokenByCredentials(traineeFromOtherCompany.local);

      const response = await app.inject({
        method: 'POST',
        url: `/courses/${coursesList[4]._id}/register-e-learning`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 if the course has accessRules and user not from a company with access', async () => {
      authToken = await getTokenByCredentials(traineeFromOtherCompany.local);

      const response = await app.inject({
        method: 'POST',
        url: `/courses/${coursesList[8]._id}/register-e-learning`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(403);
    });
  });
});

describe('COURSES ROUTES - DELETE /courses/{_id}/trainee/{traineeId}', () => {
  let authToken;
  const courseIdFromAuthCompany = coursesList[2]._id;
  const courseIdFromOtherCompany = coursesList[1]._id;
  const archivedCourse = coursesList[14]._id;
  const traineeId = coach._id;

  beforeEach(populateDB);

  describe('TRAINING_ORAGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should delete course trainee', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/courses/${courseIdFromAuthCompany.toHexString()}/trainees/${traineeId.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const course = await Course.findById(courseIdFromAuthCompany).lean();
      expect(course.trainees).toHaveLength(coursesList[2].trainees.length - 1);

      const courseHistory = await CourseHistory.countDocuments({
        course: courseIdFromAuthCompany,
        trainee: traineeId,
        action: TRAINEE_DELETION,
      });
      expect(courseHistory).toEqual(1);
    });

    it('should return 404 if course doesn\'t exist', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/courses/${new ObjectId()}/trainees/${traineeId}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 403 if course is archived', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/courses/${archivedCourse.toHexString()}/trainees/${traineeId.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'coach', expectedCode: 200 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}, requesting on his company`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'DELETE',
          url: `/courses/${courseIdFromAuthCompany.toHexString()}/trainees/${traineeId.toHexString()}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });

    it('should return 403 as user is trainer if not one of his courses', async () => {
      authToken = await getToken('trainer');
      const response = await app.inject({
        method: 'DELETE',
        url: `/courses/${coursesList[1]._id}/trainees/${traineeFromOtherCompany._id.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 as user is the inter b2b course trainer', async () => {
      authToken = await getToken('trainer');
      const response = await app.inject({
        method: 'DELETE',
        url: `/courses/${coursesList[4]._id}/trainees/${traineeId.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 200 as user is the intra course trainer', async () => {
      authToken = await getToken('trainer');
      const response = await app.inject({
        method: 'DELETE',
        url: `/courses/${courseIdFromAuthCompany.toHexString()}/trainees/${traineeId.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 403 as user is client_admin requesting on an other company', async () => {
      authToken = await getToken('client_admin');
      const response = await app.inject({
        method: 'DELETE',
        url: `/courses/${courseIdFromOtherCompany.toHexString()}/trainees/${traineeId.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });
  });
});

describe('COURSES ROUTES - GET /:_id/attendance-sheets', () => {
  let authToken;
  const courseIdFromAuthCompany = coursesList[2]._id;
  const courseIdWithoutOnSiteSlotFromAuth = coursesList[12]._id;
  const courseIdFromOtherCompany = coursesList[1]._id;
  beforeEach(populateDB);

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should return 200', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${courseIdFromAuthCompany}/attendance-sheets`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return a 404 if course does not exist', async () => {
      const invalidId = (new ObjectId()).toHexString();
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${invalidId}/attendance-sheets`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 404 if no on-site slot', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${courseIdWithoutOnSiteSlotFromAuth}/attendance-sheets`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
      expect(response.result.message).toBeDefined();
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'coach', expectedCode: 200 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}, requesting on his company`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/courses/${courseIdFromAuthCompany}/attendance-sheets`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });

    it('should return 403 as user is trainer if not one of his courses', async () => {
      authToken = await getToken('trainer');
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${coursesList[1]._id}/attendance-sheets`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 200 as user is the course trainer', async () => {
      authToken = await getTokenByCredentials(trainer.local);
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${courseIdFromAuthCompany}/attendance-sheets`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 403 as user is client_admin requesting on an other company', async () => {
      authToken = await getToken('client_admin');
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${courseIdFromOtherCompany}/attendance-sheets`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });
  });
});

describe('COURSES ROUTES - GET /{_id}/completion-certificates', () => {
  let authToken;
  const courseIdFromAuthCompany = coursesList[2]._id;
  const courseIdFromOtherCompany = coursesList[1]._id;

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(populateDB);

    let downloadFileByIdStub;
    let createDocxStub;
    beforeEach(async () => {
      downloadFileByIdStub = sinon.stub(drive, 'downloadFileById');
      createDocxStub = sinon.stub(DocxHelper, 'createDocx');
      createDocxStub.returns(path.join(__dirname, 'assets/certificate_template.docx'));
      process.env.GOOGLE_DRIVE_TRAINING_CERTIFICATE_TEMPLATE_ID = '1234';

      authToken = await getToken('training_organisation_manager');
    });

    afterEach(() => {
      downloadFileByIdStub.restore();
      createDocxStub.restore();
      process.env.GOOGLE_DRIVE_TRAINING_CERTIFICATE_TEMPLATE_ID = '';
    });

    it('should return 200', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${courseIdFromAuthCompany}/completion-certificates`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return a 404 error if course does not exist', async () => {
      const invalidId = (new ObjectId()).toHexString();
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${invalidId}/completion-certificates`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('NO_ROLE', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getTokenByCredentials(noRole.local);
    });

    it('should return 200 if user is course trainee', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${coursesList[5]._id}/completion-certificates?origin=mobile`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return a 403 if user is not course trainee', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${courseIdFromAuthCompany}/completion-certificates?origin=mobile`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 if user is not accessing certificate from mobile app', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${coursesList[5]._id}/completion-certificates`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('Other roles', () => {
    beforeEach(populateDB);

    let downloadFileByIdStub;
    let createDocxStub;
    beforeEach(async () => {
      downloadFileByIdStub = sinon.stub(drive, 'downloadFileById');
      createDocxStub = sinon.stub(DocxHelper, 'createDocx');
      createDocxStub.returns(path.join(__dirname, 'assets/certificate_template.docx'));
      process.env.GOOGLE_DRIVE_TRAINING_CERTIFICATE_TEMPLATE_ID = '1234';
      UtilsMock.mockCurrentDate('2019-01-24T15:00:00.000Z');
    });

    afterEach(() => {
      downloadFileByIdStub.restore();
      createDocxStub.restore();
      process.env.GOOGLE_DRIVE_TRAINING_CERTIFICATE_TEMPLATE_ID = '';
      UtilsMock.unmockCurrentDate();
    });

    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'coach', expectedCode: 200 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}, requesting on his company`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/courses/${courseIdFromAuthCompany}/completion-certificates`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });

    it('should return 200 as user is coach and course is inter_b2b with trainee from his company', async () => {
      authToken = await getToken('coach');
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${coursesList[9]._id}/completion-certificates`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      sinon.assert.calledOnceWithExactly(
        createDocxStub,
        `${os.tmpdir()}/certificate_template.docx`,
        {
          duration: '2h',
          learningGoals: 'on est là',
          programName: 'PROGRAM',
          startDate: '09/03/2020',
          endDate: '09/03/2020',
          trainee: { identity: 'Coach CALIF', attendanceDuration: '0h' },
          date: '24/01/2019',
        }
      );
    });

    it('should return 403 as user is trainer if not one of his courses', async () => {
      authToken = await getToken('trainer');
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${coursesList[1]._id}/completion-certificates`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 200 as user is the course trainer', async () => {
      authToken = await getTokenByCredentials(trainer.local);
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${courseIdFromAuthCompany}/completion-certificates`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 403 as user is client_admin requesting on an other company', async () => {
      authToken = await getToken('client_admin');
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${courseIdFromOtherCompany}/completion-certificates`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });
  });
});

describe('COURSES ROUTES - POST /:_id/accessrules', () => {
  let authToken;
  beforeEach(populateDB);

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should return 200', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/courses/${coursesList[8]._id}/accessrules`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { company: otherCompany._id },
      });

      expect(response.statusCode).toBe(200);
      const course = await Course.countDocuments({ _id: coursesList[8]._id, accessRules: otherCompany._id });
      expect(course).toBe(1);
    });

    it('should return 404 if course doen\'t exist', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/courses/${new ObjectId()}/accessrules`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { company: otherCompany._id },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 409 if accessRules already exist', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/courses/${coursesList[8]._id}/accessrules`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { company: authCompany._id },
      });

      expect(response.statusCode).toBe(409);
    });

    it('should return 400 if company does not exist', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/courses/${coursesList[8]._id}/accessrules`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { company: new ObjectId() },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'trainer', expectedCode: 403 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'POST',
          url: `/courses/${coursesList[8]._id}/accessrules`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload: { company: otherCompany._id },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('COURSES ROUTES - DELETE /:_id/accessrules/:accessRuleId', () => {
  let authToken;
  beforeEach(populateDB);

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should return 200', async () => {
      const courseId = coursesList[8]._id;
      const accessRulesExistBefore = await Course.countDocuments({ _id: courseId, accessRules: authCompany._id });
      const response = await app.inject({
        method: 'DELETE',
        url: `/courses/${courseId}/accessrules/${authCompany._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(accessRulesExistBefore).toBe(1);
      const accessRulesExistAfter = await Course.countDocuments({ _id: courseId, accessRules: authCompany._id });
      expect(accessRulesExistAfter).toBe(0);
    });

    it('should return 404 if course doesn\'t exist', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/courses/${new ObjectId()}/accessrules/${authCompany._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 if accessRules doesn\'t exist', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/courses/${coursesList[8]._id}/accessrules/${otherCompany._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'trainer', expectedCode: 403 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'DELETE',
          url: `/courses/${coursesList[8]._id}/accessrules/${authCompany._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('COURSES ROUTES - GET /:_id/convocations', () => {
  beforeEach(populateDB);

  describe('NOT LOGGED', () => {
    it('should return 200', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${coursesList[9]._id}/convocations`,
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 404 if course doen\'t exist', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${new ObjectId()}/convocations`,
      });

      expect(response.statusCode).toBe(404);
    });
  });
});

describe('COURSES ROUTES - PUT /courses/{_id}/companies', () => {
  let authToken;
  const interb2bCourseId = coursesList[7]._id;
  const archivedCourseId = coursesList[18]._id;
  const intraCourseId = coursesList[0]._id;

  beforeEach(populateDB);

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should add company to course companies', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${interb2bCourseId}/companies`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { company: otherCompany._id },
      });

      expect(response.statusCode).toBe(200);

      const courseHistory = await CourseHistory.countDocuments({
        course: interb2bCourseId,
        company: otherCompany._id,
        action: COMPANY_ADDITION,
      });
      expect(courseHistory).toEqual(1);

      const course = await Course.countDocuments({ _id: interb2bCourseId, companies: otherCompany._id });
      expect(course).toEqual(1);
    });

    it('should return 404 if course doesn\'t exist', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${new ObjectId()}/companies`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { company: otherCompany._id },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 if company doesn\'t exist', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${interb2bCourseId}/companies`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { company: new ObjectId() },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 403 if course is not inter_b2b', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${intraCourseId}/companies`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { company: otherCompany._id },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return a 403 if course is archived', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${archivedCourseId}/companies`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { company: otherCompany._id },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return a 409 if company is already linked to course', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${interb2bCourseId}/companies`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { company: authCompany._id },
      });

      expect(response.statusCode).toBe(409);
    });

    it('should return a 400 if company is missing in payload', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${interb2bCourseId}/companies`,
        payload: {},
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'trainer', expectedCode: 403 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'PUT',
          url: `/courses/${interb2bCourseId}/companies`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload: { company: otherCompany._id },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('COURSES ROUTES - DELETE /courses/{_id}/companies{companyId}', () => {
  let authToken;
  const interb2bCourseId = coursesList[7]._id;
  const archivedCourseId = coursesList[18]._id;
  const intraCourseId = coursesList[0]._id;

  beforeEach(populateDB);

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should remove company from course companies', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/courses/${interb2bCourseId}/companies/${thirdCompany._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);

      const courseHistory = await CourseHistory.countDocuments({
        course: interb2bCourseId,
        company: thirdCompany._id,
        action: COMPANY_DELETION,
      });
      expect(courseHistory).toEqual(1);

      const course = await Course.countDocuments({ _id: interb2bCourseId, companies: thirdCompany._id });
      expect(course).toEqual(0);
    });

    it('should return 404 if course doesn\'t exist', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/courses/${new ObjectId()}/companies/${thirdCompany._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 403 if company not in course', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/courses/${interb2bCourseId}/companies/${new ObjectId()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return a 403 if course is not inter_b2b', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/courses/${intraCourseId}/companies/${authCompany._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return a 403 if company trainee is still registered to course', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/courses/${interb2bCourseId}/companies/${authCompany._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return a 403 if company has bill', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/courses/${coursesList[19]._id}/companies/${authCompany._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
      expect(response.result.message).toEqual(translate[language].companyHasCourseBill);
    });

    it('should return a 403 if company has attendance', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/courses/${coursesList[19]._id}/companies/${thirdCompany._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
      expect(response.result.message).toEqual(translate[language].companyTraineeAttendedToCourse);
    });

    it('should return a 403 if company has attendance sheet', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/courses/${coursesList[19]._id}/companies/${otherCompany._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
      expect(response.result.message).toEqual(translate[language].CompanyTraineeHasAttendanceSheetForCourse);
    });

    it('should return a 403 if course is archived', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/courses/${archivedCourseId}/companies/${authCompany._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'trainer', expectedCode: 403 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'DELETE',
          url: `/courses/${interb2bCourseId}/companies/${thirdCompany._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
