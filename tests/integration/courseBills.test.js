const expect = require('expect');
const { ObjectId } = require('mongodb');
const { omit } = require('lodash');
const CourseBill = require('../../src/models/CourseBill');
const app = require('../../server');
const { populateDB, courseBillsList, courseList, courseFundingOrganisation } = require('./seed/courseBillsSeed');
const { authCompany, otherCompany } = require('../seed/authCompaniesSeed');

const { getToken } = require('./helpers/authentication');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('COURSE BILL ROUTES - GET /coursebills', () => {
  let authToken;
  beforeEach(populateDB);

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should get course bill for intra course (without course funding organisation)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/coursebills?course=${courseList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.courseBills.length).toEqual(1);
      expect(response.result.data.courseBills[0]).toMatchObject({
        course: courseList[0]._id,
        company: authCompany._id,
        mainFee: { price: 120 },
        netInclTaxes: 120,
      });
    });

    it('should get course bill for intra course (with course funding organisation)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/coursebills?course=${courseList[1]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.courseBills.length).toEqual(1);
      expect(response.result.data.courseBills[0]).toMatchObject({
        course: courseList[1]._id,
        company: authCompany._id,
        mainFee: { price: 120 },
        netInclTaxes: 120,
        courseFundingOrganisation: courseFundingOrganisation._id,
      });
    });

    it('should return 404 if course doesn\'t exist', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/coursebills?course=${new ObjectId()}`,
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
          method: 'GET',
          url: `/coursebills?course=${courseList[0]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('COURSE BILL ROUTES - POST /coursebills', () => {
  let authToken;
  beforeEach(populateDB);
  const payload = {
    course: courseList[2]._id,
    company: otherCompany._id,
    mainFee: { price: 120 },
    courseFundingOrganisation: courseFundingOrganisation._id,
  };

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should create a course bill', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/coursebills',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      const count = await CourseBill.countDocuments();

      expect(response.statusCode).toBe(200);
      expect(count).toBe(courseBillsList.length + 1);
    });

    const missingParams = ['course', 'company', 'mainFee', 'mainFee.price'];
    missingParams.forEach((param) => {
      it(`should return 400 as ${param} is missing`, async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/coursebills',
          payload: omit(payload, param),
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(400);
      });
    });

    const wrongParams = ['course', 'company', 'courseFundingOrganisation'];
    wrongParams.forEach((param) => {
      it(`should return 404 as ${param} doesn't exists`, async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/coursebills',
          payload: { ...payload, [param]: new ObjectId() },
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(404);
      });
    });

    it('should return 404 as company is not registered to course', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/coursebills',
        payload: { ...payload, course: courseList[0]._id },
        headers: { 'x-access-token': authToken },
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
          method: 'POST',
          url: '/coursebills',
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload,
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
