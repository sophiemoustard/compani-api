const expect = require('expect');
const sinon = require('sinon');
const moment = require('moment');
const { ObjectID } = require('mongodb');
const omit = require('lodash/omit');
const pick = require('lodash/pick');
const app = require('../../server');
const User = require('../../src/models/User');
const Course = require('../../src/models/Course');
const CourseSmsHistory = require('../../src/models/CourseSmsHistory');
const CourseHistory = require('../../src/models/CourseHistory');
const { CONVOCATION, COURSE_SMS, TRAINEE_ADDITION, TRAINEE_DELETION } = require('../../src/helpers/constants');
const {
  populateDB,
  coursesList,
  activity,
  step,
  subProgramsList,
  programsList,
  auxiliary,
  traineeWithoutCompany,
  courseTrainer,
  coachFromAuthCompany,
  helper,
  auxiliaryWithoutCompany,
  clientAdmin,
  trainerOrganisationManager,
  traineeFromOtherCompany,
  slots,
} = require('./seed/coursesSeed');
const { getToken, authCompany, getTokenByCredentials, otherCompany } = require('./seed/authenticationSeed');
const SmsHelper = require('../../src/helpers/sms');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('COURSES ROUTES - POST /courses', () => {
  let token;
  beforeEach(populateDB);

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      token = await getToken('vendor_admin');
    });

    it('should create intra course', async () => {
      const payload = { misc: 'course', type: 'intra', company: authCompany._id, subProgram: subProgramsList[0]._id };
      const response = await app.inject({
        method: 'POST',
        url: '/courses',
        headers: { 'x-access-token': token },
        payload,
      });

      expect(response.statusCode).toBe(200);
    });

    it('should create inter_b2b course', async () => {
      const payload = { misc: 'course', type: 'inter_b2b', subProgram: subProgramsList[0]._id };
      const response = await app.inject({
        method: 'POST',
        url: '/courses',
        headers: { 'x-access-token': token },
        payload,
      });

      expect(response.statusCode).toBe(200);
    });

    const missingParams = [
      { path: 'company' },
      { path: 'subProgram' },
      { path: 'type' },
    ];
    const payload = { misc: 'course', type: 'intra', company: authCompany._id, subProgram: subProgramsList[0]._id };
    missingParams.forEach((test) => {
      it(`should return a 400 error if missing '${test.path}' parameter`, async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/courses',
          payload: omit({ ...payload }, test.path),
          headers: { 'x-access-token': token },
        });

        expect(response.statusCode).toBe(400);
      });
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
        const payload = { misc: 'course', type: 'intra', company: authCompany._id, subProgram: subProgramsList[0]._id };
        token = await getToken(role.name);
        const response = await app.inject({
          method: 'POST',
          url: '/courses',
          headers: { 'x-access-token': token },
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

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should get all courses', async () => {
      const coursesNumber = coursesList.length;
      const response = await app.inject({
        method: 'GET',
        url: '/courses',
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.courses.length).toEqual(coursesNumber);
      expect(response.result.data.courses[3]).toEqual(expect.objectContaining({
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
        trainer: null,
        slots: [{
          startDate: moment('2020-03-20T09:00:00').toDate(),
          endDate: moment('2020-03-20T11:00:00').toDate(),
          courseId: coursesList[3]._id,
          _id: expect.any(ObjectID),
        }],
        trainees: expect.arrayContaining([expect.objectContaining({
          _id: expect.any(ObjectID),
          company: pick(authCompany, ['_id', 'name']),
        })]),
      }));
      expect(response.result.data.courses[3].slotsToPlan).toHaveLength(1);
      expect(response.result.data.courses[3].subProgram.program.description).toBeUndefined();
      expect(response.result.data.courses[3].trainees[0].local).toBeUndefined();
      expect(response.result.data.courses[3].trainees[0].refreshtoken).toBeUndefined();
    });

    it('should get courses for a specific trainee', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses?trainees=${traineeFromOtherCompany._id}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.courses.length).toEqual(2);
    });

    it('should return 200 for a specific trainee without company', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses?trainees=${traineeWithoutCompany._id}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.courses.length).toEqual(0);
    });

    it('should get blended courses', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/courses?format=blended',
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.courses.length).toEqual(4);
    });

    it('should get strictly e-learning courses', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/courses?format=strictly_e_learning',
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.courses.length).toEqual(4);
    });
  });

  describe('CLIENT_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should not get any course', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/courses',
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should get course if trainee from same company', async () => {
      authToken = await getToken('client_admin');
      const response = await app.inject({
        method: 'GET',
        url: `/courses?trainees=${helper._id}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.courses.length).toEqual(2);
    });

    it('should not get course if trainee from different company', async () => {
      authToken = await getToken('client_admin');
      const response = await app.inject({
        method: 'GET',
        url: `/courses?trainees=${traineeFromOtherCompany._id}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('Other roles', () => {
    it('should get courses with a specific trainer', async () => {
      authToken = await getTokenByCredentials(courseTrainer.local);
      const response = await app.inject({
        method: 'GET',
        url: `/courses?trainer=${courseTrainer._id}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.courses.length).toEqual(2);
    });

    it('should get courses for a specific company', async () => {
      authToken = await getToken('coach');
      const response = await app.inject({
        method: 'GET',
        url: `/courses?company=${authCompany._id}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.courses.length).toEqual(3);
    });

    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
      { name: 'training_organisation_manager', expectedCode: 200 },
      { name: 'trainer', expectedCode: 403 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name} requesting all courses`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: '/courses',
          headers: { 'x-access-token': authToken },
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

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should get intra course', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${courseFromAuthCompanyIntra._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.course).toEqual(expect.objectContaining({
        _id: courseFromAuthCompanyIntra._id,
        subProgram: {
          _id: expect.any(ObjectID),
          program: {
            _id: expect.any(ObjectID),
            name: programsList[0].name,
            description: programsList[0].description,
            subPrograms: [expect.any(ObjectID)],
          },
          steps: [{
            _id: expect.any(ObjectID),
            name: step.name,
            type: step.type,
          }],
        },
        trainer: expect.objectContaining({
          _id: courseTrainer._id,
          identity: { firstname: 'trainer', lastname: 'trainer' },
        }),
        company: { _id: authCompany._id, name: 'Test SAS' },
        contact: { name: '' },
        slots: expect.arrayContaining([
          expect.objectContaining({
            startDate: moment('2020-03-20T09:00:00').toDate(),
            endDate: moment('2020-03-20T11:00:00').toDate(),
            courseId: courseFromAuthCompanyIntra._id,
            _id: expect.any(ObjectID),
          }),
          expect.objectContaining({
            startDate: moment('2020-03-20T14:00:00').toDate(),
            endDate: moment('2020-03-20T18:00:00').toDate(),
            courseId: courseFromAuthCompanyIntra._id,
            _id: expect.any(ObjectID),
          }),
        ]),
        trainees: expect.arrayContaining([
          expect.objectContaining({
            _id: expect.any(ObjectID),
            identity: { firstname: 'Coach', lastname: 'Calif' },
            company: pick(authCompany, ['_id', 'name']),
          }),
          expect.objectContaining({
            _id: expect.any(ObjectID),
            identity: { firstname: 'Helper', lastname: 'Test' },
            company: pick(authCompany, ['_id', 'name']),
          }),
          expect.objectContaining({
            _id: expect.any(ObjectID),
            identity: { firstname: 'client_admin', lastname: 'Chef' },
            company: pick(authCompany, ['_id', 'name']),
          }),
          expect.objectContaining({
            _id: expect.any(ObjectID),
            identity: { firstname: 'trainer', lastname: 'trainer' },
          }),
        ]),
      }));
    });

    it('should get inter b2b course with all trainees', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${courseFromAuthCompanyInterB2b._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.course.trainees).toEqual(expect.arrayContaining([
        expect.objectContaining({
          _id: expect.any(ObjectID),
          identity: { firstname: 'Coach', lastname: 'Calif' },
          company: pick(authCompany, ['_id', 'name']),
        }),
        expect.objectContaining({
          _id: expect.any(ObjectID),
          identity: { firstname: 'Fred', lastname: 'Astaire' },
          company: pick(otherCompany, ['_id', 'name']),
        }),
      ]));
    });
  });

  describe('CLIENT_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should get inter b2b course with trainees from same company', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${courseFromAuthCompanyInterB2b._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.course.trainees).toEqual(expect.arrayContaining([expect.objectContaining({
        _id: expect.any(ObjectID),
        identity: { firstname: 'Coach', lastname: 'Calif' },
        company: pick(authCompany, ['_id', 'name']),
      })]));
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 200 },
      { name: 'client_admin', expectedCode: 200 },
      { name: 'training_organisation_manager', expectedCode: 200 },
      { name: 'trainer', expectedCode: 200 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);

        const response = await app.inject({
          method: 'GET',
          url: `/courses/${courseFromAuthCompanyInterB2b._id.toHexString()}`,
          headers: { 'x-access-token': authToken },
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

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should get course with follow up', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${coursesList[0]._id.toHexString()}/follow-up`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.followUp).toEqual(expect.objectContaining({
        _id: courseFromAuthCompanyIntra._id,
        subProgram: expect.objectContaining({
          _id: subProgramsList[0]._id,
          name: subProgramsList[0].name,
          steps: expect.arrayContaining([expect.objectContaining({
            _id: step._id,
            name: step.name,
            type: step.type,
            activities: expect.arrayContaining([expect.objectContaining({
              _id: activity._id,
              followUp: expect.any(Array),
              activityHistories: expect.any(Array),
              name: expect.any(String),
              type: expect.any(String),
            })]),
          })]),
        }),
      }));
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 200 },
      { name: 'client_admin', expectedCode: 200 },
      { name: 'training_organisation_manager', expectedCode: 200 },
      { name: 'trainer', expectedCode: 200 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);

        const response = await app.inject({
          method: 'GET',
          url: `/courses/${coursesList[0]._id.toHexString()}/follow-up`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('COURSES ROUTES - GET /courses/user', () => {
  let authToken = null;
  beforeEach(populateDB);

  describe('Get user own courses for each role', () => {
    const roles = [
      { name: 'helper', user: helper, expectedCode: 200, numberOfCourse: 2 },
      { name: 'auxiliary', user: auxiliary, expectedCode: 200, numberOfCourse: 1 },
      {
        name: 'auxiliary_without_company',
        user: auxiliaryWithoutCompany,
        expectedCode: 200,
        numberOfCourse: 0,
      },
      { name: 'coach', user: coachFromAuthCompany, expectedCode: 200, numberOfCourse: 4 },
      { name: 'client_admin', user: clientAdmin, expectedCode: 200, numberOfCourse: 3 },
      {
        name: 'training_organisation_manager',
        user: trainerOrganisationManager,
        expectedCode: 200,
        numberOfCourse: 1,
      },
      {
        name: 'trainer',
        user: courseTrainer,
        expectedCode: 200,
        numberOfCourse: 1,
      },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getTokenByCredentials(role.user.local);

        const response = await app.inject({
          method: 'GET',
          url: '/courses/user',
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
        expect(response.result.data.courses.length).toBe(role.numberOfCourse);
        if (response.result.data.courses.length) {
          expect(response.result.data.courses[0]).toEqual(expect.objectContaining({
            subProgram: expect.objectContaining({
              _id: expect.any(ObjectID),
              program: {
                _id: expect.any(ObjectID),
                name: programsList[0].name,
                image: programsList[0].image,
                subPrograms: [expect.any(ObjectID)],
              },
              steps: expect.arrayContaining([
                expect.objectContaining({
                  _id: expect.any(ObjectID),
                  name: step.name,
                  type: step.type,
                  areActivitiesValid: false,
                  progress: expect.any(Number),
                  activities: expect.arrayContaining([
                    expect.objectContaining({
                      _id: expect.any(ObjectID),
                      name: activity.name,
                      type: activity.type,
                      cards: expect.arrayContaining([
                        expect.objectContaining({ _id: expect.any(ObjectID), template: 'title_text', isValid: false }),
                      ]),
                      quizCount: 0,
                      areCardsValid: false,
                      activityHistories: expect.arrayContaining([
                        expect.objectContaining({ user: role.user._id }),
                      ]),
                    })]),
                })]),
            }),
            slots: expect.arrayContaining([expect.objectContaining({
              startDate: expect.any(Date),
              endDate: expect.any(Date),
              step: expect.objectContaining({
                type: expect.any(String),
              }),
            })]),
          }));
          expect(response.result.data.courses[0].subProgram.steps[0].activities[0].activityHistories
            .every(history => history.user.toHexString() === role.user._id.toHexString())).toBeTruthy();
        }
      });
    });
  });

  it('should return 401 if user is not login', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/courses/user',
    });

    expect(response.statusCode).toBe(401);
  });
});

describe('COURSES ROUTES - GET /courses/{_id}/public-infos', () => {
  let authToken = null;
  const courseIdFromAuthCompany = coursesList[0]._id;
  beforeEach(populateDB);

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should get course', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${courseIdFromAuthCompany.toHexString()}/public-infos`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.course._id).toEqual(courseIdFromAuthCompany);
    });
  });

  it('should get course even if not authenticate', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/courses/${courseIdFromAuthCompany.toHexString()}/public-infos`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.result.data.course._id).toEqual(courseIdFromAuthCompany);
  });
});

describe('COURSES ROUTES - GET /courses/{_id}/user', () => {
  let authToken = null;
  const courseId = coursesList[0]._id;
  beforeEach(populateDB);

  it('should get course if trainee', async () => {
    authToken = await getTokenByCredentials(coachFromAuthCompany.local);
    const response = await app.inject({
      method: 'GET',
      url: `/courses/${courseId.toHexString()}/user`,
      headers: { 'x-access-token': authToken },
    });

    expect(response.statusCode).toBe(200);
    expect(response.result.data.course).toEqual(expect.objectContaining({
      _id: courseId,
      subProgram: expect.objectContaining({
        _id: expect.any(ObjectID),
        program: {
          _id: expect.any(ObjectID),
          name: programsList[0].name,
          image: programsList[0].image,
          subPrograms: [expect.any(ObjectID)],
        },
        steps: [{
          _id: expect.any(ObjectID),
          name: step.name,
          type: step.type,
          areActivitiesValid: false,
          progress: expect.any(Number),
          activities: [{
            _id: expect.any(ObjectID),
            name: activity.name,
            type: activity.type,
            cards: expect.arrayContaining([{ _id: expect.any(ObjectID), template: 'title_text', isValid: false }]),
            quizCount: 0,
            areCardsValid: false,
            activityHistories: expect.arrayContaining([
              expect.objectContaining({ user: coachFromAuthCompany._id }),
              expect.not.objectContaining({ user: clientAdmin._id }),
            ]),
          }],
        }],
      }),
      slots: expect.arrayContaining([
        expect.objectContaining({
          ...pick(slots[0], ['startDate, endDate, step']),
        }),
      ]),
    }));
    expect(response.result.data.course.subProgram.steps[0].activities[0].activityHistories).toHaveLength(1);
  });

  it('should not get course if not trainee', async () => {
    authToken = await getToken('vendor_admin');
    const response = await app.inject({
      method: 'GET',
      url: `/courses/${courseId.toHexString()}/user`,
      headers: { 'x-access-token': authToken },
    });

    expect(response.statusCode).toBe(403);
  });
});

describe('COURSES ROUTES - PUT /courses/{_id}', () => {
  let token;
  const courseIdFromAuthCompany = coursesList[0]._id;
  const courseIdFromOtherCompany = coursesList[1]._id;
  beforeEach(populateDB);

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      token = await getToken('vendor_admin');
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
        headers: { 'x-access-token': token },
        payload,
      });

      expect(response.statusCode).toBe(200);

      const course = await Course.findOne({ _id: courseIdFromAuthCompany }).lean();

      expect(course.misc).toEqual(payload.misc);
      expect(course.trainer).toEqual(payload.trainer);
      expect(course.contact).toEqual(payload.contact);
    });

    it('should return 400 error if contact phone number is invalid', async () => {
      const payload = {
        contact: { phone: '07772211' },
      };
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${courseIdFromAuthCompany}`,
        headers: { 'x-access-token': token },
        payload,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 200 },
      { name: 'client_admin', expectedCode: 200 },
      { name: 'training_organisation_manager', expectedCode: 200 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}, requesting on his company`, async () => {
        const payload = { misc: 'new name' };
        token = await getToken(role.name);
        const response = await app.inject({
          method: 'PUT',
          url: `/courses/${courseIdFromAuthCompany}`,
          headers: { 'x-access-token': token },
          payload,
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });

    it('should return 403 as user is trainer if not one of his courses', async () => {
      const payload = { misc: 'new name' };
      token = await getToken('trainer');
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${coursesList[1]._id}`,
        headers: { 'x-access-token': token },
        payload,
      });

      expect(response.statusCode).toBe(403);
    });

    ['coach', 'client_admin'].forEach((role) => {
      it(`should return 403 as user is ${role} requesting on an other company`, async () => {
        const payload = { misc: 'new name' };
        token = await getToken(role);
        const response = await app.inject({
          method: 'PUT',
          url: `/courses/${courseIdFromOtherCompany}`,
          headers: { 'x-access-token': token },
          payload,
        });

        expect(response.statusCode).toBe(403);
      });
    });

    it('should return 200 as user is the course trainer', async () => {
      const payload = { misc: 'new name' };
      token = await getToken('trainer');
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${courseIdFromAuthCompany}`,
        headers: { 'x-access-token': token },
        payload,
      });

      expect(response.statusCode).toBe(200);
    });
  });
});

describe('COURSES ROUTES - DELETE /courses/{_id}', () => {
  let token;
  const courseIdWithTrainees = coursesList[4]._id;
  const courseIdWithSlots = coursesList[5]._id;
  const courseIdWithoutTraineesAndSlots = coursesList[6]._id;
  const courseIdWithSlotsToPLan = coursesList[7]._id;
  beforeEach(populateDB);

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      token = await getToken('vendor_admin');
    });

    it('should delete course', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/courses/${courseIdWithoutTraineesAndSlots}`,
        headers: { 'x-access-token': token },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 403 as course has trainees', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/courses/${courseIdWithTrainees}`,
        headers: { 'x-access-token': token },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 as course has slots to plan', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/courses/${courseIdWithSlotsToPLan}`,
        headers: { 'x-access-token': token },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 as course has slots', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/courses/${courseIdWithSlots}`,
        headers: { 'x-access-token': token },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
      { name: 'trainer', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'training_organisation_manager', expectedCode: 200 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}, requesting on his company`, async () => {
        token = await getToken(role.name);
        const response = await app.inject({
          method: 'DELETE',
          url: `/courses/${courseIdWithoutTraineesAndSlots}`,
          headers: { 'x-access-token': token },
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

  beforeEach(async () => {
    authToken = await getToken('vendor_admin');
    SmsHelperStub = sinon.stub(SmsHelper, 'send');
  });
  afterEach(() => {
    SmsHelperStub.restore();
  });

  it('should send a SMS to user from compani', async () => {
    const smsHistoryBefore = await CourseSmsHistory.countDocuments({ course: courseIdFromAuthCompany }).lean();
    SmsHelperStub.returns('SMS SENT !');
    const response = await app.inject({
      method: 'POST',
      url: `/courses/${courseIdFromAuthCompany}/sms`,
      payload,
      headers: { 'x-access-token': authToken },
    });

    expect(response.statusCode).toBe(200);
    expect(response.result.message).toBe('SMS bien envoyé.');
    const smsHistoryAfter = await CourseSmsHistory.countDocuments({ course: courseIdFromAuthCompany }).lean();
    expect(smsHistoryAfter).toEqual(smsHistoryBefore + 1);
    sinon.assert.calledWithExactly(
      SmsHelperStub,
      {
        recipient: `+33${coachFromAuthCompany.contact.phone.substring(1)}`,
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
      headers: { 'x-access-token': authToken },
    });
    expect(response.statusCode).toBe(400);
    sinon.assert.notCalled(SmsHelperStub);
  });

  const missingParams = ['content', 'type'];
  missingParams.forEach((param) => {
    it(`should return a 400 error if missing ${param} parameter`, async () => {
      SmsHelperStub.returns('SMS SENT !');
      const response = await app.inject({
        method: 'POST',
        url: `/courses/${courseIdFromAuthCompany}/sms`,
        payload: omit(payload, param),
        headers: { 'x-access-token': authToken },
      });
      expect(response.statusCode).toBe(400);
      sinon.assert.notCalled(SmsHelperStub);
    });
  });

  const roles = [
    { name: 'helper', expectedCode: 403 },
    { name: 'auxiliary', expectedCode: 403 },
    { name: 'auxiliary_without_company', expectedCode: 403 },
    { name: 'coach', expectedCode: 200 },
    { name: 'client_admin', expectedCode: 200 },
    { name: 'training_organisation_manager', expectedCode: 200 },
  ];
  roles.forEach((role) => {
    it(`should return ${role.expectedCode} as user is ${role.name}, requesting on his company`, async () => {
      SmsHelperStub.returns('SMS SENT !');
      authToken = await getToken(role.name);
      const response = await app.inject({
        method: 'POST',
        url: `/courses/${courseIdFromAuthCompany}/sms`,
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(role.expectedCode);
    });
  });

  it('should return 403 as user is trainer if not one of his courses', async () => {
    SmsHelperStub.returns('SMS SENT !');
    authToken = await getToken('trainer');
    const response = await app.inject({
      method: 'POST',
      url: `/courses/${coursesList[1]._id}/sms`,
      headers: { 'x-access-token': authToken },
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
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(403);
    });
  });

  it('should return 200 as user is the course trainer', async () => {
    SmsHelperStub.returns('SMS SENT !');
    authToken = await getTokenByCredentials(courseTrainer.local);
    const response = await app.inject({
      method: 'POST',
      url: `/courses/${courseIdFromAuthCompany}/sms`,
      headers: { 'x-access-token': authToken },
      payload,
    });

    expect(response.statusCode).toBe(200);
  });
});

describe('COURSES ROUTES - GET /courses/{_id}/sms', () => {
  let authToken;
  const courseIdFromAuthCompany = coursesList[0]._id;
  const courseIdFromOtherCompany = coursesList[1]._id;

  beforeEach(populateDB);

  beforeEach(async () => {
    authToken = await getToken('vendor_admin');
  });

  it('should get SMS from course', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/courses/${courseIdFromAuthCompany}/sms`,
      headers: { 'x-access-token': authToken },
    });

    expect(response.statusCode).toBe(200);
    expect(response.result.data.sms).toHaveLength(1);
    expect(response.result.data.sms.every(sms => sms.course.toHexString() === courseIdFromAuthCompany.toHexString()))
      .toBeTruthy();
  });

  const roles = [
    { name: 'helper', expectedCode: 403 },
    { name: 'auxiliary', expectedCode: 403 },
    { name: 'auxiliary_without_company', expectedCode: 403 },
    { name: 'coach', expectedCode: 200 },
    { name: 'client_admin', expectedCode: 200 },
    { name: 'training_organisation_manager', expectedCode: 200 },
  ];
  roles.forEach((role) => {
    it(`should return ${role.expectedCode} as user is ${role.name}, requesting on his company`, async () => {
      authToken = await getToken(role.name);
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${courseIdFromAuthCompany}/sms`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(role.expectedCode);
    });
  });

  it('should return 403 as user is trainer if not one of his courses', async () => {
    authToken = await getToken('trainer');
    const response = await app.inject({
      method: 'GET',
      url: `/courses/${coursesList[1]._id}/sms`,
      headers: { 'x-access-token': authToken },
    });

    expect(response.statusCode).toBe(403);
  });

  ['coach', 'client_admin'].forEach((role) => {
    it(`should return 403 as user is ${role} requesting on an other company`, async () => {
      authToken = await getToken(role);
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${courseIdFromOtherCompany}/sms`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  it('should return a 200 as user is course trainer', async () => {
    authToken = await getTokenByCredentials(courseTrainer.local);
    const response = await app.inject({
      method: 'GET',
      url: `/courses/${courseIdFromAuthCompany}/sms`,
      headers: { 'x-access-token': authToken },
    });

    expect(response.statusCode).toBe(200);
  });
});

describe('COURSES ROUTES - POST /courses/{_id}/trainee', () => {
  let token;
  const intraCourseIdFromAuthCompany = coursesList[0]._id;
  const intraCourseIdFromOtherCompany = coursesList[1]._id;
  const intraCourseIdWithTrainee = coursesList[2]._id;
  const interb2bCourseIdFromAuthCompany = coursesList[4]._id;
  const payload = {
    identity: { firstname: 'Coco', lastname: 'Bongo' },
    local: { email: 'coco_bongo@alenvi.io' },
    contact: { phone: '0689320234' },
    company: authCompany._id,
  };
  const existingUserPayload = { local: { email: auxiliary.local.email }, company: authCompany._id };

  beforeEach(populateDB);

  describe('intra', () => {
    describe('VENDOR_ADMIN', () => {
      beforeEach(async () => {
        token = await getToken('vendor_admin');
      });

      it('should add existing user to course trainees', async () => {
        const response = await app.inject({
          method: 'POST',
          url: `/courses/${intraCourseIdFromAuthCompany}/trainees`,
          headers: { 'x-access-token': token },
          payload: existingUserPayload,
        });

        expect(response.statusCode).toBe(200);
        expect(response.result.data.course.trainees).toEqual(expect.arrayContaining([auxiliary._id]));

        const courseHistory = await CourseHistory.countDocuments({
          course: intraCourseIdFromAuthCompany,
          trainee: auxiliary._id,
          action: TRAINEE_ADDITION,
        });
        expect(courseHistory).toEqual(1);
      });

      it('should add new user to course trainees', async () => {
        const response = await app.inject({
          method: 'POST',
          url: `/courses/${intraCourseIdFromAuthCompany}/trainees`,
          headers: { 'x-access-token': token },
          payload,
        });

        expect(response.statusCode).toBe(200);
        const newUser = await User.findOne({ 'local.email': payload.local.email }).lean({ autopopulate: true });
        expect(newUser).toBeDefined();
        expect(newUser.serialNumber).toBeDefined();
        expect(newUser.role).toBeUndefined();
        expect(response.result.data.course.trainees).toEqual(expect.arrayContaining([newUser._id]));

        const courseHistory = await CourseHistory.countDocuments({
          course: intraCourseIdFromAuthCompany,
          trainee: newUser._id,
          action: TRAINEE_ADDITION,
        });
        expect(courseHistory).toEqual(1);
      });

      it('should add user to course trainees, and update user by adding his company', async () => {
        const updatePayload = { local: { email: traineeWithoutCompany.local.email }, company: authCompany._id };
        const response = await app.inject({
          method: 'POST',
          url: `/courses/${intraCourseIdFromAuthCompany}/trainees`,
          payload: updatePayload,
          headers: { 'x-access-token': token },
        });

        expect(response.statusCode).toBe(200);
        const updatedUser = await User.findOne({ 'local.email': updatePayload.local.email })
          .lean({ autopopulate: true });
        expect(updatedUser).toBeDefined();
        expect(updatedUser.company).toBeDefined();
        expect(response.result.data.course.trainees).toEqual(expect.arrayContaining([updatedUser._id]));
      });

      it('should return a 409 error if user is not from the course company', async () => {
        const response = await app.inject({
          method: 'POST',
          url: `/courses/${intraCourseIdFromOtherCompany}/trainees`,
          headers: { 'x-access-token': token },
          payload: existingUserPayload,
        });

        expect(response.statusCode).toBe(409);
      });

      it('should return a 409 error as user "trainee" exists and is already registered to course', async () => {
        const response = await app.inject({
          method: 'POST',
          url: `/courses/${intraCourseIdWithTrainee}/trainees`,
          headers: { 'x-access-token': token },
          payload: {
            ...pick(coachFromAuthCompany, ['local.email', 'company']),
            identity: { lastname: 'same_trainee' },
          },
        });

        expect(response.statusCode).toBe(409);
      });

      it('should return a 400 error if missing email parameter', async () => {
        const falsyPayload = omit(payload, 'local.email');
        const response = await app.inject({
          method: 'POST',
          url: `/courses/${intraCourseIdFromAuthCompany}/trainees`,
          payload: falsyPayload,
          headers: { 'x-access-token': token },
        });

        expect(response.statusCode).toBe(400);
      });

      const missingParams = ['identity.lastname', 'company'];
      missingParams.forEach((path) => {
        it(`should return a 400 error if user has to be created, and missing '${path}' parameter`, async () => {
          const falsyPayload = omit(payload, path);
          const response = await app.inject({
            method: 'POST',
            url: `/courses/${intraCourseIdFromAuthCompany}/trainees`,
            payload: falsyPayload,
            headers: { 'x-access-token': token },
          });

          expect(response.statusCode).toBe(400);
        });
      });
    });

    describe('Other roles', () => {
      const roles = [
        { name: 'helper', expectedCode: 403 },
        { name: 'auxiliary', expectedCode: 403 },
        { name: 'auxiliary_without_company', expectedCode: 403 },
        { name: 'coach', expectedCode: 200 },
        { name: 'client_admin', expectedCode: 200 },
        { name: 'training_organisation_manager', expectedCode: 200 },
      ];
      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}, requesting on his company`, async () => {
          token = await getToken(role.name);
          const response = await app.inject({
            method: 'POST',
            url: `/courses/${intraCourseIdFromAuthCompany}/trainees`,
            headers: { 'x-access-token': token },
            payload,
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });

      it('should return 403 as user is trainer if not one of his courses', async () => {
        token = await getToken('trainer');
        const response = await app.inject({
          method: 'POST',
          url: `/courses/${coursesList[1]._id}/trainees`,
          headers: { 'x-access-token': token },
          payload,
        });

        expect(response.statusCode).toBe(403);
      });

      ['coach', 'client_admin'].forEach((role) => {
        it(`should return 403 as user is ${role} requesting on an other company`, async () => {
          token = await getToken(role);
          const response = await app.inject({
            method: 'POST',
            url: `/courses/${intraCourseIdFromOtherCompany}/trainees`,
            headers: { 'x-access-token': token },
            payload,
          });

          expect(response.statusCode).toBe(403);
        });
      });

      it('should return a 200 as user is course trainer', async () => {
        token = await getTokenByCredentials(courseTrainer.local);
        const response = await app.inject({
          method: 'POST',
          url: `/courses/${intraCourseIdFromAuthCompany}/trainees`,
          headers: { 'x-access-token': token },
          payload,
        });

        expect(response.statusCode).toBe(200);
      });
    });
  });

  describe('inter_b2b vendor_role', () => {
    beforeEach(async () => {
      token = await getToken('vendor_admin');
    });

    it('should add user to inter b2b course', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/courses/${interb2bCourseIdFromAuthCompany}/trainees`,
        headers: { 'x-access-token': token },
        payload: existingUserPayload,
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.course.trainees).toEqual(expect.arrayContaining([auxiliary._id]));
    });

    it('should return a 400 error if trainee exist, has no company, and missing company parameter', async () => {
      const falsyPayload = { local: { email: traineeWithoutCompany.local.email } };
      const response = await app.inject({
        method: 'POST',
        url: `/courses/${interb2bCourseIdFromAuthCompany}/trainees`,
        payload: falsyPayload,
        headers: { 'x-access-token': token },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});

describe('COURSES ROUTES - POST /courses/{_id}/register-e-learning', () => {
  let token;
  const course = coursesList[4];

  beforeEach(populateDB);

  describe('TRAINER_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      token = await getTokenByCredentials(trainerOrganisationManager.local);
    });

    it('should add trainee to e-learning course', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/courses/${course._id}/register-e-learning`,
        headers: { 'x-access-token': token },
      });

      expect(response.statusCode).toBe(200);
      const courseUpdated = await Course.findById(course._id);
      expect(courseUpdated.trainees).toEqual(expect.arrayContaining([trainerOrganisationManager._id]));
    });

    it('should return 401 if user not authenticated', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/courses/${course._id}/register-e-learning`,
        headers: { 'x-access-token': '' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 404 if course does not exist', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/courses/${new ObjectID()}/register-e-learning`,
        headers: { 'x-access-token': token },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 403 if course is not strictly e learning', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/courses/${coursesList[0]._id}/register-e-learning`,
        headers: { 'x-access-token': token },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 if trainee already suscribed to course', async () => {
      token = await getTokenByCredentials(traineeFromOtherCompany.local);

      const response = await app.inject({
        method: 'POST',
        url: `/courses/${course._id}/register-e-learning`,
        headers: { 'x-access-token': token },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 200 },
      { name: 'auxiliary', expectedCode: 200 },
      { name: 'auxiliary_without_company', expectedCode: 200 },
      { name: 'coach', expectedCode: 200 },
      { name: 'client_admin', expectedCode: 200 },
      { name: 'training_organisation_manager', expectedCode: 200 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}, requesting on his company`, async () => {
        token = await getToken(role.name);
        const response = await app.inject({
          method: 'POST',
          url: `/courses/${coursesList[6]._id}/register-e-learning`,
          headers: { 'x-access-token': token },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('COURSES ROUTES - DELETE /courses/{_id}/trainee/{traineeId}', () => {
  let authToken = null;
  const courseIdFromAuthCompany = coursesList[2]._id;
  const courseIdFromOtherCompany = coursesList[3]._id;
  const traineeId = coachFromAuthCompany._id;

  beforeEach(populateDB);

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should delete course trainee', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/courses/${courseIdFromAuthCompany.toHexString()}/trainees/${traineeId.toHexString()}`,
        headers: { 'x-access-token': authToken },
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
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 200 },
      { name: 'client_admin', expectedCode: 200 },
      { name: 'training_organisation_manager', expectedCode: 200 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}, requesting on his company`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'DELETE',
          url: `/courses/${courseIdFromAuthCompany.toHexString()}/trainees/${traineeId.toHexString()}`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });

    it('should return 403 as user is trainer if not one of his courses', async () => {
      authToken = await getToken('trainer');
      const response = await app.inject({
        method: 'DELETE',
        url: `/courses/${coursesList[1]._id}/trainees/${traineeFromOtherCompany._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(403);
    });

    ['coach', 'client_admin'].forEach((role) => {
      it(`should return 403 as user is ${role} requesting on an other company`, async () => {
        authToken = await getToken(role);
        const response = await app.inject({
          method: 'DELETE',
          url: `/courses/${courseIdFromOtherCompany.toHexString()}/trainees/${traineeId.toHexString()}`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(403);
      });
    });

    it('should return 200 as user is the course trainer', async () => {
      authToken = await getTokenByCredentials(courseTrainer.local);
      const response = await app.inject({
        method: 'DELETE',
        url: `/courses/${courseIdFromAuthCompany.toHexString()}/trainees/${traineeId.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
    });
  });
});

describe('COURSE ROUTES - GET /:_id/attendance-sheets', () => {
  let authToken = null;
  const courseIdFromAuthCompany = coursesList[2]._id;
  const courseIdFromOtherCompany = coursesList[3]._id;
  beforeEach(populateDB);

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should return 200', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${courseIdFromAuthCompany}/attendance-sheets`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return a 404 error if course does not exist', async () => {
      const invalidId = (new ObjectID()).toHexString();
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${invalidId}/attendance-sheets`,
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
      { name: 'coach', expectedCode: 200 },
      { name: 'client_admin', expectedCode: 200 },
      { name: 'training_organisation_manager', expectedCode: 200 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}, requesting on his company`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/courses/${courseIdFromAuthCompany}/attendance-sheets`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });

    it('should return 403 as user is trainer if not one of his courses', async () => {
      authToken = await getToken('trainer');
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${coursesList[1]._id}/attendance-sheets`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(403);
    });

    ['coach', 'client_admin'].forEach((role) => {
      it(`should return 403 as user is ${role} requesting on an other company`, async () => {
        authToken = await getToken(role);
        const response = await app.inject({
          method: 'GET',
          url: `/courses/${courseIdFromOtherCompany}/attendance-sheets`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(403);
      });
    });

    it('should return 200 as user is the course trainer', async () => {
      authToken = await getTokenByCredentials(courseTrainer.local);
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${courseIdFromAuthCompany}/attendance-sheets`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
    });
  });
});

describe('COURSE ROUTES - GET /:_id/completion-certificates', () => {
  let authToken = null;
  const courseIdFromAuthCompany = coursesList[2]._id;
  const courseIdFromOtherCompany = coursesList[3]._id;
  beforeEach(populateDB);

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should return 200', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${courseIdFromAuthCompany}/completion-certificates`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return a 404 error if course does not exist', async () => {
      const invalidId = (new ObjectID()).toHexString();
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${invalidId}/completion-certificates`,
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
      { name: 'coach', expectedCode: 200 },
      { name: 'client_admin', expectedCode: 200 },
      { name: 'training_organisation_manager', expectedCode: 200 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}, requesting on his company`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/courses/${courseIdFromAuthCompany}/completion-certificates`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });

    it('should return 403 as user is trainer if not one of his courses', async () => {
      authToken = await getToken('trainer');
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${coursesList[1]._id}/completion-certificates`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(403);
    });

    ['coach', 'client_admin'].forEach((role) => {
      it(`should return 403 as user is ${role} requesting on an other company`, async () => {
        authToken = await getToken(role);
        const response = await app.inject({
          method: 'GET',
          url: `/courses/${courseIdFromOtherCompany}/completion-certificates`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(403);
      });
    });

    it('should return 200 as user is the course trainer', async () => {
      authToken = await getTokenByCredentials(courseTrainer.local);
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${courseIdFromAuthCompany}/completion-certificates`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
    });
  });
});
