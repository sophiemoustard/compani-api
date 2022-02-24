const expect = require('expect');
const { ObjectId } = require('mongodb');
const { omit } = require('lodash');
const CourseBill = require('../../src/models/CourseBill');
const app = require('../../server');
const { populateDB, courseBillsList, courseList, courseFundingOrganisationList } = require('./seed/courseBillsSeed');
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
        mainFee: { price: 120, count: 1 },
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
        mainFee: { price: 120, count: 2 },
        netInclTaxes: 240,
        courseFundingOrganisation: courseFundingOrganisationList[0]._id,
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
    mainFee: { price: 120, count: 1 },
    courseFundingOrganisation: courseFundingOrganisationList[0]._id,
  };

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should create a course bill with courseFundingOrganisation', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/coursebills',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(200);

      const count = await CourseBill.countDocuments();
      expect(count).toBe(courseBillsList.length + 1);
    });

    it('should create a course bill without courseFundingOrganisation', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/coursebills',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: omit(payload, 'courseFundingOrganisation'),
      });

      expect(response.statusCode).toBe(200);

      const count = await CourseBill.countDocuments();
      expect(count).toBe(courseBillsList.length + 1);
    });

    const missingParams = ['course', 'company', 'mainFee', 'mainFee.price', 'mainFee.count'];
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

    const wrongValues = [
      { key: 'price', value: -200 },
      { key: 'price', value: '200€' },
      { key: 'count', value: -200 },
      { key: 'count', value: 1.23 },
      { key: 'count', value: '1x' },
    ];
    wrongValues.forEach((param) => {
      it(`should return 400 as ${param.key} has wrong value : ${param.value}`, async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/coursebills',
          payload: { ...payload, mainFee: { ...payload.mainFee, [param.key]: param.value } },
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

describe('COURSE BILL ROUTES - PUT /coursebills/{_id}', () => {
  let authToken;
  beforeEach(populateDB);
  const payload = {
    courseFundingOrganisation: courseFundingOrganisationList[0]._id,
  };

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should add a courseFundingOrganisation to course bill', async () => {
      const countBefore = await CourseBill.countDocuments({
        _id: courseBillsList[0]._id,
        courseFundingOrganisation: { $exists: false },
      });

      const response = await app.inject({
        method: 'PUT',
        url: `/coursebills/${courseBillsList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(200);

      const countAfter = await CourseBill.countDocuments({
        _id: courseBillsList[0]._id,
        courseFundingOrganisation: courseFundingOrganisationList[0]._id,
      });
      expect(countBefore).toBeTruthy();
      expect(countAfter).toBeTruthy();
    });

    it('should change courseFundingOrganisation to course bill', async () => {
      const countBefore = await CourseBill.countDocuments({
        _id: courseBillsList[1]._id,
        courseFundingOrganisation: courseFundingOrganisationList[0]._id,
      });

      const response = await app.inject({
        method: 'PUT',
        url: `/coursebills/${courseBillsList[1]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { courseFundingOrganisation: courseFundingOrganisationList[1]._id },
      });

      expect(response.statusCode).toBe(200);

      const countAfter = await CourseBill.countDocuments({
        _id: courseBillsList[1]._id,
        courseFundingOrganisation: courseFundingOrganisationList[1]._id,
      });
      expect(countBefore).toBeTruthy();
      expect(countAfter).toBeTruthy();
    });

    it('should remove courseFundingOrganisation on course bill', async () => {
      const countBefore = await CourseBill
        .countDocuments({ _id: courseBillsList[1]._id, courseFundingOrganisation: { $exists: true } });

      const response = await app.inject({
        method: 'PUT',
        url: `/coursebills/${courseBillsList[1]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { courseFundingOrganisation: '' },
      });

      expect(response.statusCode).toBe(200);

      const countAfter = await CourseBill
        .countDocuments({ _id: courseBillsList[1]._id, courseFundingOrganisation: { $exists: false } });
      expect(countBefore).toBeTruthy();
      expect(countAfter).toBeTruthy();
    });

    it('should return 404 if course bill doesn\'t exist', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/coursebills/${new ObjectId()}`,
        payload,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 if course funding organisation doesn\'t exist', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/coursebills/${courseBillsList[0]._id}`,
        payload: { courseFundingOrganisation: new ObjectId() },
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
          method: 'PUT',
          url: `/coursebills/${courseBillsList[0]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload,
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});