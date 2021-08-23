const expect = require('expect');
const sinon = require('sinon');
const path = require('path');
const moment = require('moment');
const { ObjectID } = require('mongodb');
const omit = require('lodash/omit');
const pick = require('lodash/pick');
const app = require('../../server');
const User = require('../../src/models/User');
const Course = require('../../src/models/Course');
const drive = require('../../src/models/Google/Drive');
const CourseSmsHistory = require('../../src/models/CourseSmsHistory');
const CourseHistory = require('../../src/models/CourseHistory');
const { CONVOCATION, COURSE_SMS, TRAINEE_ADDITION, TRAINEE_DELETION, WEBAPP } = require('../../src/helpers/constants');
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
const { getToken, authCompany, getTokenByCredentials, otherCompany } = require('./seed/authenticationSeed');
const {
  noRoleNoCompany,
  coach,
  auxiliary,
  trainer,
  clientAdmin,
  vendorAdmin,
  trainerAndCoach,
} = require('../seed/userSeed');
const SmsHelper = require('../../src/helpers/sms');
const DocxHelper = require('../../src/helpers/docx');
const NotificationHelper = require('../../src/helpers/notifications');
const UtilsHelper = require('../../src/helpers/utils');
const NodemailerHelper = require('../../src/helpers/nodemailer');

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
        type: 'inter_b2b',
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
    });

    it('should create intra course', async () => {
      const payload = {
        misc: 'course',
        type: 'intra',
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
    });

    it('should return 403 if invalid salesRepresentative', async () => {
      const payload = {
        misc: 'course',
        type: 'inter_b2b',
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

    const payload = {
      misc: 'course',
      company: authCompany._id,
      subProgram: subProgramsList[0]._id,
      type: 'intra',
      salesRepresentative: vendorAdmin._id,
    };
    ['company', 'subProgram'].forEach((param) => {
      it(`should return a 400 error if missing '${param}' parameter`, async () => {
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
          type: 'intra',
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
  let authToken = null;
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
          _id: expect.any(ObjectID),
          program: {
            _id: programsList[0]._id,
            name: programsList[0].name,
            image: programsList[0].image,
            subPrograms: [expect.any(ObjectID)],
          },
        }),
        trainer: pick(trainerAndCoach, ['_id', 'identity.firstname', 'identity.lastname']),
        slots: [{
          startDate: moment('2020-03-20T09:00:00').toDate(),
          endDate: moment('2020-03-20T11:00:00').toDate(),
          course: coursesList[3]._id,
          _id: expect.any(ObjectID),
        }],
        trainees: expect.arrayContaining([expect.objectContaining({
          _id: expect.any(ObjectID),
          company: expect.objectContaining(pick(authCompany, ['_id', 'name'])),
        })]),
        slotsToPlan: [{ _id: expect.any(ObjectID), course: course._id }],
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
      expect(response.result.data.courses.length).toEqual(5);
    });

    it('should get strictly e-learning courses', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/courses?format=strictly_e_learning',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.courses.length).toEqual(7);
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
      expect(response.result.data.courses.length).toEqual(3);
    });

    it('should get courses for a specific company', async () => {
      authToken = await getToken('coach');
      const response = await app.inject({
        method: 'GET',
        url: `/courses?company=${authCompany._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.courses.length).toEqual(6);
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
  let authToken = null;
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
        url: `/courses/${courseFromAuthCompanyIntra._id.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.course._id.toHexString()).toBe(courseFromAuthCompanyIntra._id.toHexString());
    });

    it('should get inter b2b course with all trainees', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${courseFromAuthCompanyInterB2b._id.toHexString()}`,
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
        url: `/courses/${courseFromAuthCompanyInterB2b._id.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.course._id.toHexString()).toBe(courseFromAuthCompanyInterB2b._id.toHexString());
    });

    it('should return 403 if course is eLearning and has accessRules that doesn\'t contain user company ',
      async () => {
        const response = await app.inject({
          method: 'GET',
          url: `/courses/${coursesList[11]._id.toHexString()}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(403);
      });

    it('should return 403 if course is intra and user company is not course company', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${coursesList[1]._id.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 if course is inter_b2b and no trainee is from user company', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${coursesList[10]._id.toHexString()}`,
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
        url: `/courses/${courseFromAuthCompanyInterB2b._id.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 403 if user is trainer and isn\'t course\'s trainer', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${coursesList[10]._id.toHexString()}`,
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
          url: `/courses/${courseFromAuthCompanyInterB2b._id.toHexString()}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('COURSES ROUTES - GET /courses/{_id}/follow-up', () => {
  let authToken = null;
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
  let authToken = null;
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
  let authToken = null;
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
        url: `/courses/${new ObjectID()}/questionnaires`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 if course is strictly e-learning', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${coursesList[4]._id.toHexString()}/questionnaires`,
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
  let authToken = null;
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
      const traineeId = new ObjectID();
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
  beforeEach(populateDB);

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should update course', async () => {
      const payload = {
        misc: 'new name',
        trainer: new ObjectID(),
        contact: { name: 'name new contact', email: 'test@toto.aa', phone: '0777228811' },
      };
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${courseIdFromAuthCompany}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(200);

      const course = await Course.countDocuments({ _id: courseIdFromAuthCompany, ...payload }).lean();
      expect(course).toEqual(1);
    });

    it('should return 400 error if contact phone number is invalid', async () => {
      const payload = { contact: { phone: '07772211' } };
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${courseIdFromAuthCompany}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(400);
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
      const payload = {
        misc: 'new name',
        trainer: new ObjectID(),
        contact: { name: 'name new contact', email: 'test@toto.aa', phone: '0777228811' },
      };
      authToken = await getToken('coach');

      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${courseIdFromAuthCompany}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 403 as user is client_admin but not in the company of the course', async () => {
      const payload = {
        misc: 'new name',
        trainer: new ObjectID(),
        contact: { name: 'name new contact', email: 'test@toto.aa', phone: '0777228811' },
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
  });
});

describe('COURSES ROUTES - DELETE /courses/{_id}', () => {
  let authToken;
  const courseIdWithTrainees = coursesList[4]._id;
  const courseIdWithSlots = coursesList[5]._id;
  const courseIdWithoutTraineesAndSlots = coursesList[6]._id;
  const courseIdWithSlotsToPLan = coursesList[7]._id;
  beforeEach(populateDB);

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should delete course', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/courses/${courseIdWithoutTraineesAndSlots}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const courseCount = await Course.countDocuments({ _id: courseIdWithoutTraineesAndSlots });
      expect(courseCount).toBe(0);
    });

    it('should return 404 if course does not exist', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/courses/${new ObjectID()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 403 as course has trainees', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/courses/${courseIdWithTrainees}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 as course has slots to plan', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/courses/${courseIdWithSlotsToPLan}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 as course has slots', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/courses/${courseIdWithSlots}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
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
          url: `/courses/${courseIdWithoutTraineesAndSlots}`,
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
  const courseIdFromOtherCompany = coursesList[3]._id;
  let SmsHelperStub;
  const payload = { content: 'Ceci est un test', type: CONVOCATION };

  beforeEach(populateDB);

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
      SmsHelperStub = sinon.stub(SmsHelper, 'send');
    });
    afterEach(() => {
      SmsHelperStub.restore();
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
      SmsHelperStub.returns('SMS SENT !');
      const response = await app.inject({
        method: 'POST',
        url: `/courses/${courseIdFromAuthCompany}/sms`,
        payload: { ...payload, type: 'qwert' },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
      sinon.assert.notCalled(SmsHelperStub);
    });

    ['content', 'type'].forEach((param) => {
      it(`should return a 400 error if missing ${param} parameter`, async () => {
        SmsHelperStub.returns('SMS SENT !');
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

    ['coach', 'client_admin'].forEach((role) => {
      it(`should return 403 as user is ${role} requesting on an other company`, async () => {
        SmsHelperStub.returns('SMS SENT !');
        authToken = await getToken(role);
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
});

describe('COURSES ROUTES - GET /courses/{_id}/sms', () => {
  let authToken;
  const courseIdFromAuthCompany = coursesList[0]._id;
  const courseIdFromOtherCompany = coursesList[1]._id;

  beforeEach(populateDB);

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
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
      { name: 'client_admin', expectedCode: 200 },
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

    ['coach', 'client_admin'].forEach((role) => {
      it(`should return 403 as user is ${role} requesting on an other company`, async () => {
        authToken = await getToken(role);
        const response = await app.inject({
          method: 'GET',
          url: `/courses/${courseIdFromOtherCompany}/sms`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(403);
      });
    });
  });
});

describe('COURSES ROUTES - POST /courses/{_id}/trainee', () => {
  let authToken;
  let sendinBlueTransporter;
  let sendNotificationToUser;
  const intraCourseIdFromAuthCompany = coursesList[0]._id;
  const intraCourseIdFromOtherCompany = coursesList[1]._id;
  const intraCourseIdWithTrainee = coursesList[2]._id;
  const interb2bCourseIdFromAuthCompany = coursesList[4]._id;

  beforeEach(populateDB);

  beforeEach(() => {
    sendinBlueTransporter = sinon.stub(NodemailerHelper, 'sendinBlueTransporter')
      .returns({ sendMail: sinon.stub().returns('emailSent') });
    sendNotificationToUser = sinon.stub(NotificationHelper, 'sendNotificationToUser');
  });
  afterEach(() => {
    sendinBlueTransporter.restore();
    sendNotificationToUser.restore();
  });

  describe('intra', () => {
    describe('TRAINING_ORGANISATION_MANAGER', () => {
      beforeEach(async () => {
        authToken = await getToken('training_organisation_manager');
      });

      it('should add existing user to course trainees', async () => {
        const existingUserPayload = { local: { email: traineeFromAuthCompanyWithFormationExpoToken.local.email } };

        const response = await app.inject({
          method: 'POST',
          url: `/courses/${intraCourseIdFromAuthCompany}/trainees`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload: existingUserPayload,
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

      it('should add new user to course trainees', async () => {
        const payload = {
          identity: { firstname: 'Coco', lastname: 'Bongo' },
          local: { email: 'coco_bongo@alenvi.io' },
          contact: { phone: '0689320234' },
          company: authCompany._id,
        };

        const response = await app.inject({
          method: 'POST',
          url: `/courses/${intraCourseIdFromAuthCompany}/trainees`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload,
        });

        expect(response.statusCode).toBe(200);
        const newUser = await User.findOne({ 'local.email': payload.local.email }).lean();
        expect(newUser).toBeDefined();
        const courseHistory = await CourseHistory.countDocuments({
          course: intraCourseIdFromAuthCompany,
          trainee: newUser._id,
          action: TRAINEE_ADDITION,
        });
        expect(courseHistory).toEqual(1);
        sinon.assert.calledOnce(sendinBlueTransporter);
      });

      it('should return a 409 error if user is not from the course company', async () => {
        const existingUserPayload = { local: { email: auxiliary.local.email } };

        const response = await app.inject({
          method: 'POST',
          url: `/courses/${intraCourseIdFromOtherCompany}/trainees`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload: existingUserPayload,
        });

        expect(response.statusCode).toBe(409);
      });

      it('should return a 409 error as user "trainee" exists and is already registered to course', async () => {
        const response = await app.inject({
          method: 'POST',
          url: `/courses/${intraCourseIdWithTrainee}/trainees`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload: { ...pick(coach, ['local.email']), identity: { lastname: 'same_trainee' } },
        });

        expect(response.statusCode).toBe(409);
      });

      it('should return 400 if phone is not valid', async () => {
        const payload = {
          identity: { firstname: 'Coco', lastname: 'Bongo' },
          local: { email: 'coco_bongo@alenvi.io' },
          contact: { phone: '12' },
          company: authCompany._id,
        };

        const response = await app.inject({
          method: 'POST',
          url: `/courses/${intraCourseIdFromAuthCompany}/trainees`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload,
        });

        expect(response.statusCode).toBe(400);
      });

      it('should return 400 if email is not valid', async () => {
        const payload = {
          identity: { firstname: 'Coco', lastname: 'Bongo' },
          local: { email: 'coc' },
          contact: { phone: '0987654321' },
          company: authCompany._id,
        };

        const response = await app.inject({
          method: 'POST',
          url: `/courses/${intraCourseIdFromAuthCompany}/trainees`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload,
        });

        expect(response.statusCode).toBe(400);
      });

      const missingParams = ['identity.lastname', 'company', 'local.email', 'contact.phone'];
      missingParams.forEach((param) => {
        it(`should return a 400 error if user has to be created, and missing '${param}' parameter`, async () => {
          const payload = {
            identity: { firstname: 'Coco', lastname: 'Bongo' },
            local: { email: 'coco_bongo@alenvi.io' },
            company: authCompany._id,
          };

          const falsyPayload = omit(payload, param);
          const response = await app.inject({
            method: 'POST',
            url: `/courses/${intraCourseIdFromAuthCompany}/trainees`,
            payload: falsyPayload,
            headers: { Cookie: `alenvi_token=${authToken}` },
          });

          expect(response.statusCode).toBe(400);
        });
      });
    });
  });

  describe('inter_b2b vendor_role', () => {
    describe('TRAINING_ORGANISATION_MANAGER', () => {
      beforeEach(async () => {
        authToken = await getToken('training_organisation_manager');
      });

      it('should add user to inter b2b course', async () => {
        const existingUserPayload = { local: { email: auxiliary.local.email } };

        const response = await app.inject({
          method: 'POST',
          url: `/courses/${interb2bCourseIdFromAuthCompany}/trainees`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload: existingUserPayload,
        });

        expect(response.statusCode).toBe(200);
      });

      it('should return a 400 error if trainee exist, has no company, and missing company parameter', async () => {
        const falsyPayload = { local: { email: traineeWithoutCompany.local.email } };
        const response = await app.inject({
          method: 'POST',
          url: `/courses/${interb2bCourseIdFromAuthCompany}/trainees`,
          payload: falsyPayload,
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
      { name: 'coach', expectedCode: 200 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}, requesting on his company`, async () => {
        const payload = {
          identity: { firstname: 'Coco', lastname: 'Bongo' },
          local: { email: 'coco_bongo@alenvi.io' },
          company: authCompany._id,
          contact: { phone: '0689320234' },
        };

        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'POST',
          url: `/courses/${intraCourseIdFromAuthCompany}/trainees`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload,
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });

    it('should return 403 as user is trainer if not one of his courses', async () => {
      const payload = {
        identity: { firstname: 'Coco', lastname: 'Bongo' },
        local: { email: 'coco_bongo@alenvi.io' },
        company: authCompany._id,
        contact: { phone: '0689320234' },
      };

      authToken = await getToken('trainer');
      const response = await app.inject({
        method: 'POST',
        url: `/courses/${coursesList[1]._id}/trainees`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return a 200 as user is course trainer', async () => {
      const payload = {
        identity: { firstname: 'Coco', lastname: 'Bongo' },
        local: { email: 'coco_bongo@alenvi.io' },
        company: authCompany._id,
        contact: { phone: '0689320234' },
      };

      authToken = await getTokenByCredentials(trainer.local);
      const response = await app.inject({
        method: 'POST',
        url: `/courses/${intraCourseIdFromAuthCompany}/trainees`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(200);
      sinon.assert.calledWithExactly(sendinBlueTransporter);
    });

    ['coach', 'client_admin'].forEach((role) => {
      it(`should return 403 as user is ${role} requesting on an other company`, async () => {
        const payload = {
          identity: { firstname: 'Coco', lastname: 'Bongo' },
          local: { email: 'coco_bongo@alenvi.io' },
          company: authCompany._id,
          contact: { phone: '0689320234' },
        };

        authToken = await getToken(role);
        const response = await app.inject({
          method: 'POST',
          url: `/courses/${intraCourseIdFromOtherCompany}/trainees`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload,
        });

        expect(response.statusCode).toBe(403);
      });
    });
  });
});

describe('COURSES ROUTES - POST /courses/{_id}/register-e-learning', () => {
  let authToken;
  const course = coursesList[4];

  beforeEach(populateDB);

  describe('Logged user', () => {
    beforeEach(async () => {
      authToken = await getTokenByCredentials(noRoleNoCompany.local);
    });

    it('should add trainee to e-learning course', async () => {
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
        url: `/courses/${new ObjectID()}/register-e-learning`,
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
        url: `/courses/${course._id}/register-e-learning`,
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
  let authToken = null;
  const courseIdFromAuthCompany = coursesList[2]._id;
  const courseIdFromOtherCompany = coursesList[3]._id;
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

    ['coach', 'client_admin'].forEach((role) => {
      it(`should return 403 as user is ${role} requesting on an other company`, async () => {
        authToken = await getToken(role);
        const response = await app.inject({
          method: 'DELETE',
          url: `/courses/${courseIdFromOtherCompany.toHexString()}/trainees/${traineeId.toHexString()}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(403);
      });
    });
  });
});

describe('COURSES ROUTES - GET /:_id/attendance-sheets', () => {
  let authToken = null;
  const courseIdFromAuthCompany = coursesList[2]._id;
  const courseIdFromOtherCompany = coursesList[3]._id;
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

    it('should return a 404 error if course does not exist', async () => {
      const invalidId = (new ObjectID()).toHexString();
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${invalidId}/attendance-sheets`,
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

    ['coach', 'client_admin'].forEach((role) => {
      it(`should return 403 as user is ${role} requesting on an other company`, async () => {
        authToken = await getToken(role);
        const response = await app.inject({
          method: 'GET',
          url: `/courses/${courseIdFromOtherCompany}/attendance-sheets`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(403);
      });
    });
  });
});

describe('COURSES ROUTES - GET /:_id/completion-certificates', () => {
  let authToken = null;
  const courseIdFromAuthCompany = coursesList[2]._id;
  const courseIdFromOtherCompany = coursesList[3]._id;

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
      const invalidId = (new ObjectID()).toHexString();
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${invalidId}/completion-certificates`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
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
    });

    afterEach(() => {
      downloadFileByIdStub.restore();
      createDocxStub.restore();
      process.env.GOOGLE_DRIVE_TRAINING_CERTIFICATE_TEMPLATE_ID = '';
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

    ['coach', 'client_admin'].forEach((role) => {
      it(`should return 403 as user is ${role} requesting on an other company`, async () => {
        authToken = await getToken(role);
        const response = await app.inject({
          method: 'GET',
          url: `/courses/${courseIdFromOtherCompany}/completion-certificates`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(403);
      });
    });
  });
});

describe('COURSES ROUTES - POST /:_id/accessrules', () => {
  let authToken = null;
  beforeEach(populateDB);

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should return 200', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/courses/${coursesList[8]._id}/accessrules`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { company: otherCompany._id },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 404 if course doen\'t exist', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/courses/${new ObjectID()}/accessrules`,
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

    it('should return 400 if no accessRules in payload', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/courses/${coursesList[8]._id}/accessrules`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'training_organisation_manager', expectedCode: 200 },
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
  let authToken = null;
  beforeEach(populateDB);

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should return 200', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/courses/${coursesList[8]._id}/accessrules/${authCompany._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 404 if course doen\'t exist', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/courses/${new ObjectID()}/accessrules/${authCompany._id}`,
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
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'training_organisation_manager', expectedCode: 200 },
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
  let authToken = null;
  beforeEach(populateDB);

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should return 200', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${coursesList[9]._id}/convocations`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 404 if course doen\'t exist', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${new ObjectID()}/convocations`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    describe('User not authenticate', () => {
      it('should get pdf even if not authenticate', async () => {
        const response = await app.inject({
          method: 'GET',
          url: `/courses/${coursesList[9]._id}/convocations`,
        });

        expect(response.statusCode).toBe(200);
      });
    });
  });
});
