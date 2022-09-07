const expect = require('expect');
const sinon = require('sinon');
const path = require('path');
const moment = require('moment');
const { fn: momentProto } = require('moment');
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
} = require('./seed/coursesSeed');
const { getToken, getTokenByCredentials } = require('./helpers/authentication');
const { otherCompany, authCompany } = require('../seed/authCompaniesSeed');
const {
  noRoleNoCompany,
  coach,
  trainer,
  clientAdmin,
  vendorAdmin,
  trainerAndCoach,
} = require('../seed/authUsersSeed');
const SmsHelper = require('../../src/helpers/sms');
const DocxHelper = require('../../src/helpers/docx');
const NotificationHelper = require('../../src/helpers/notifications');
const UtilsHelper = require('../../src/helpers/utils');
const UtilsMock = require('../utilsMock');

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
        estimatedStartDate: '2022-05-31T08:00:00',
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

    it('should create intra course', async () => {
      const payload = {
        misc: 'course',
        type: INTRA,
        maxTrainees: 12,
        company: authCompany._id,
        subProgram: subProgramsList[0]._id,
        salesRepresentative: vendorAdmin._id,
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

    const payload = {
      misc: 'course',
      company: authCompany._id,
      subProgram: subProgramsList[0]._id,
      type: INTRA,
      maxTrainees: 8,
      salesRepresentative: vendorAdmin._id,
    };
    ['company', 'subProgram', 'maxTrainees'].forEach((param) => {
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

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should get all courses', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/courses',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.courses.length).toEqual(coursesList.length);

      const course = response.result.data.courses.find(c => UtilsHelper.areObjectIdsEquals(coursesList[3]._id, c._id));
      expect(course).toEqual(expect.objectContaining({
        company: pick(otherCompany, ['_id', 'name']),
        subProgram: expect.objectContaining({
          _id: expect.any(ObjectId),
          program: {
            _id: programsList[0]._id,
            name: programsList[0].name,
            image: programsList[0].image,
            subPrograms: [expect.any(ObjectId)],
          },
        }),
        trainer: pick(trainerAndCoach, ['_id', 'identity.firstname', 'identity.lastname']),
        slots: [{
          startDate: moment('2020-03-20T09:00:00').toDate(),
          endDate: moment('2020-03-20T11:00:00').toDate(),
          course: coursesList[3]._id,
          _id: expect.any(ObjectId),
        }],
        trainees: expect.arrayContaining([expect.objectContaining({
          _id: expect.any(ObjectId),
          company: expect.objectContaining(pick(authCompany, ['_id', 'name'])),
        })]),
        slotsToPlan: [{ _id: expect.any(ObjectId), course: course._id }],
      }));
      expect(course.trainees[0].local).toBeUndefined();
      expect(course.trainees[0].refreshtoken).toBeUndefined();
    });

    it('should get blended courses', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/courses?format=blended',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.courses.length).toEqual(13);
    });

    it('should get strictly e-learning courses', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/courses?format=strictly_e_learning',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.courses.length).toEqual(4);
    });

    it('should return 400 if bad format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/courses?format=poiuytrewq',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Other roles', () => {
    it('should get courses with a specific trainer', async () => {
      authToken = await getTokenByCredentials(trainer.local);
      const response = await app.inject({
        method: 'GET',
        url: `/courses?trainer=${trainer._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.courses.length).toEqual(7);
    });

    it('should get courses for a specific company', async () => {
      authToken = await getToken('coach');
      const response = await app.inject({
        method: 'GET',
        url: `/courses?company=${authCompany._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.courses.length).toEqual(9);
    });

    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'trainer', expectedCode: 403 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name} requesting all courses`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: '/courses',
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

    it('should get intra course', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${courseFromAuthCompanyIntra._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.course._id.toHexString()).toBe(courseFromAuthCompanyIntra._id.toHexString());
    });

    it('should get inter b2b course with all trainees', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${courseFromAuthCompanyInterB2b._id}`,
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

    it('should get inter b2b course', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${courseFromAuthCompanyInterB2b._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.course._id.toHexString()).toBe(courseFromAuthCompanyInterB2b._id.toHexString());
    });

    it('should return course if course is eLearning and has accessRules that contain user company',
      async () => {
        const response = await app.inject({
          method: 'GET',
          url: `/courses/${coursesList[8]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(200);
      });

    it('should return 403 if course is eLearning and has accessRules that doesn\'t contain user company',
      async () => {
        const response = await app.inject({
          method: 'GET',
          url: `/courses/${coursesList[11]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(403);
      });

    it('should return 403 if course is intra and user company is not course company', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${coursesList[1]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 if course is inter_b2b and no trainee is from user company', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${coursesList[10]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('TRAINER', () => {
    beforeEach(async () => {
      authToken = await getToken('trainer');
    });

    it('should return 200 if user is trainer and is course\'s trainer', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${courseFromAuthCompanyInterB2b._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 403 if user is trainer and isn\'t course\'s trainer', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${coursesList[10]._id}`,
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
          url: `/courses/${courseFromAuthCompanyInterB2b._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('COURSES ROUTES - GET /courses/{_id}/follow-up', () => {
  let authToken;
  const courseFromAuthCompanyIntra = coursesList[0];
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
      expect(response.result.data.followUp._id.toHexString()).toBe(courseFromAuthCompanyIntra._id.toHexString());
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

describe('COURSES ROUTES - GET /courses/user', () => {
  let authToken;
  beforeEach(populateDB);

  it('should return 200 as user is logged in', async () => {
    authToken = await getTokenByCredentials(noRoleNoCompany.local);

    const response = await app.inject({
      method: 'GET',
      url: '/courses/user',
      headers: { 'x-access-token': authToken },
    });

    expect(response.statusCode).toBe(200);
    expect(response.result.data.courses.length).toBe(1);
  });

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    it('should return 200 if valid traineeId', async () => {
      authToken = await getToken('training_organisation_manager');
      const response = await app.inject({
        method: 'GET',
        url: `/courses/user?traineeId=${userCompanies[0].user.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should throw 404 if invalid traineeId', async () => {
      authToken = await getToken('vendor_admin');
      const traineeId = new ObjectId();
      const response = await app.inject({
        method: 'GET',
        url: `/courses/user?traineeId=${traineeId.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    it('should return 200 if coach and same company', async () => {
      authToken = await getToken('coach');
      const response = await app.inject({
        method: 'GET',
        url: `/courses/user?traineeId=${userCompanies[1].user.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 200 if coach and trainer and same company', async () => {
      authToken = await getTokenByCredentials(trainerAndCoach.local);
      const response = await app.inject({
        method: 'GET',
        url: `/courses/user?traineeId=${userCompanies[1].user.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 404 if client admin and different company', async () => {
      authToken = await getToken('client_admin');
      const response = await app.inject({
        method: 'GET',
        url: `/courses/user?traineeId=${userCompanies[0].user.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    const roles = [
      { name: 'helper', expectedCode: 404 },
      { name: 'planning_referent', expectedCode: 404 },
      { name: 'trainer', expectedCode: 404 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/courses/user?traineeId=${userCompanies[0].user.toHexString()}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('COURSES ROUTES - GET /courses/{_id}/user', () => {
  let authToken;
  const eLearningCourseId = coursesList[8]._id;
  beforeEach(populateDB);

  it('should get course if trainee', async () => {
    const courseId = coursesList[5]._id;
    authToken = await getTokenByCredentials(noRoleNoCompany.local);
    const response = await app.inject({
      method: 'GET',
      url: `/courses/${courseId.toHexString()}/user`,
      headers: { 'x-access-token': authToken },
    });

    expect(response.statusCode).toBe(200);
    expect(response.result.data.course._id).toEqual(courseId);
  });

  it('should not get course if not trainee', async () => {
    const courseId = coursesList[0]._id;
    authToken = await getTokenByCredentials(noRoleNoCompany.local);
    const response = await app.inject({
      method: 'GET',
      url: `/courses/${courseId.toHexString()}/user`,
      headers: { 'x-access-token': authToken },
    });

    expect(response.statusCode).toBe(403);
  });

  it('should get course if has access authorization', async () => {
    authToken = await getTokenByCredentials(coach.local);
    const response = await app.inject({
      method: 'GET',
      url: `/courses/${eLearningCourseId.toHexString()}/user`,
      headers: { Cookie: `alenvi_token=${authToken}` },
    });

    expect(response.statusCode).toBe(200);
  });

  it('should not get course if has not access authorization', async () => {
    authToken = await getTokenByCredentials(traineeFromOtherCompany.local);
    const response = await app.inject({
      method: 'GET',
      url: `/courses/${eLearningCourseId.toHexString()}/user`,
      headers: { Cookie: `alenvi_token=${authToken}` },
    });

    expect(response.statusCode).toBe(403);
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
        estimatedStartDate: '2022-05-31T08:00:00',
      };
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${coursesList[4]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(200);

      const course = await Course.countDocuments({ _id: coursesList[4]._id, ...payload }).lean();
      expect(course).toEqual(1);
    });

    it('should update company representative', async () => {
      const payload = { companyRepresentative: coach._id };
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${coursesList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(200);

      const course = await Course.countDocuments({ _id: coursesList[0]._id, ...payload }).lean();
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

    const payloads = [
      { misc: 'new name' },
      { trainer: new ObjectId() },
      { contact: vendorAdmin._id },
      { salesRepresentative: new ObjectId() },
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
      const payload = { archivedAt: new Date('2020-03-25T09:00:00') };
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
      expect(course.slots.every(slot => moment(slot.endDate).isBefore(payload.archivedAt))).toBeTruthy();
    });

    it('should return 403 if trying to archive course without slot', async () => {
      const payload = { archivedAt: new Date('2020-03-25T09:00:00') };
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
      expect(course.slots.every(slot => moment(slot.endDate).isBefore(payload.archivedAt))).toBeTruthy();
    });

    it('should return 403 if trying to archive course with slot to plan', async () => {
      const payload = { archivedAt: new Date('2020-03-25T09:00:00') };
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
      expect(course.slots.every(slot => moment(slot.endDate).isBefore(payload.archivedAt))).toBeTruthy();
    });

    it('should return 403 if trying to archive a not blended course', async () => {
      const payload = { archivedAt: new Date('2020-03-25T09:00:00') };
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
      expect(course.slots.every(slot => moment(slot.endDate).isBefore(payload.archivedAt))).toBeTruthy();
    });

    it('should return 403 if trying to archive a course in progress', async () => {
      const payload = { archivedAt: new Date('2020-03-10T00:00:00') };
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
      expect(course.slots.every(slot => moment(slot.endDate).isBefore(payload.archivedAt))).toBeFalsy();
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
      const payload = { misc: 'new name' };
      authToken = await getToken('trainer');
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${courseIdFromAuthCompany}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 403 as user is course trainer but try to update salesRepresentative', async () => {
      const payload = { salesRepresentative: vendorAdmin._id };
      authToken = await getToken('trainer');
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${courseIdFromAuthCompany}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 as user is trainer if not one of his courses', async () => {
      const payload = { misc: 'new name' };
      authToken = await getToken('trainer');
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${coursesList[1]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(403);
    });

    it('should update course as user is coach in the company of the course', async () => {
      const payload = { misc: 'new name' };
      authToken = await getToken('coach');

      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${courseIdFromAuthCompany}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(200);
    });

    it('should not update course as user is coach but try to update trainer', async () => {
      const payload = { trainer: new ObjectId() };
      authToken = await getToken('coach');

      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${courseIdFromAuthCompany}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 as user is client_admin and try to update estimated start date', async () => {
      const payload = { estimatedStartDate: '2022-01-01T08:00:00' };
      authToken = await getToken('client_admin');

      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${courseIdFromAuthCompany}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 as user is trainer and try to update estimated start date', async () => {
      const payload = { estimatedStartDate: '2022-01-01T08:00:00' };
      authToken = await getToken('trainer');

      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${courseIdFromAuthCompany}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 as user is client_admin but not in the company of the course', async () => {
      const payload = {
        misc: 'new name',
        trainer: new ObjectId(),
      };
      authToken = await getToken('client_admin');

      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${coursesList[1]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 if coach try to update contact', async () => {
      const payload = { misc: 'new name', contact: vendorAdmin._id };
      authToken = await getToken('coach');

      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${courseIdFromAuthCompany}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
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
  let momentIsBefore;
  const payload = { content: 'Ceci est un test', type: CONVOCATION };

  beforeEach(populateDB);
  beforeEach(async () => {
    SmsHelperStub = sinon.stub(SmsHelper, 'send');
    momentIsBefore = sinon.stub(momentProto, 'isBefore').returns(true);
  });
  afterEach(() => {
    SmsHelperStub.restore();
    momentIsBefore.restore();
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

    it('should return a 403 if course has no slot to come', async () => {
      momentIsBefore.returns(false);
      const response = await app.inject({
        method: 'POST',
        url: `/courses/${courseIdFromAuthCompany}/sms`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);

      const course = await Course.findById(courseIdFromAuthCompany)
        .populate({ path: 'slots', select: 'startDate endDate' })
        .populate({ path: 'slotsToPlan' })
        .populate({ path: 'trainees', select: 'contact.phone' })
        .lean();

      const hasSlotToCome = course.slots && course.slots.some(slot => moment().isBefore(slot.startDate));
      const hasReceiver = course.trainees && course.trainees.some(trainee => get(trainee, 'contact.phone'));
      expect(hasSlotToCome).toBeFalsy();
      expect(hasReceiver).toBeTruthy();

      sinon.assert.notCalled(SmsHelperStub);
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

      const hasSlotToCome = course.slots && course.slots.some(slot => moment().isBefore(slot.startDate));
      const hasReceiver = course.trainees && course.trainees.some(trainee => get(trainee, 'contact.phone'));
      expect(hasSlotToCome).toBeTruthy();
      expect(hasReceiver).toBeFalsy();

      sinon.assert.notCalled(SmsHelperStub);
    });

    it('should return a 403 if course is archived', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/courses/${archivedCourseId}/sms`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
      const courseIsArchived = !!await Course.findById(archivedCourseId, { archivedAt: 1 }).lean();

      expect(courseIsArchived).toBeTruthy();
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

describe('COURSES ROUTES - PUT /courses/{_id}/trainee', () => {
  let authToken;
  let sendNotificationToUser;
  const intraCourseIdFromAuthCompany = coursesList[0]._id;
  const archivedCourse = coursesList[14]._id;
  const intraCourseIdFromOtherCompany = coursesList[1]._id;
  const intraCourseIdWithTrainee = coursesList[2]._id;
  const interb2bCourseIdFromAuthCompany = coursesList[4]._id;

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

    it('should return a 403 if course is archived', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${archivedCourse}/trainees`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { trainee: traineeFromAuthCompanyWithFormationExpoToken._id },
      });

      expect(response.statusCode).toBe(403);
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

    it('should return a 409 if user is already registered to course ', async () => {
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
        url: `/courses/${coursesList[1]._id}/trainees`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { trainee: traineeFromAuthCompanyWithFormationExpoToken._id },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 200 as user is course trainer', async () => {
      authToken = await getTokenByCredentials(trainer.local);
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

      expect(response.statusCode).toBe(404);
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

    it('should return 200 as user is the course trainer', async () => {
      authToken = await getTokenByCredentials(trainer.local);
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

  describe('NO_ROLE_NO_COMPANY', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getTokenByCredentials(noRoleNoCompany.local);
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
        url: `/courses/${coursesList[8]._id}/completion-certificates`,
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
          startDate: '20/03/2020',
          endDate: '20/03/2020',
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
