const expect = require('expect');
const GetStream = require('get-stream');
const { ObjectID } = require('mongodb');
const sinon = require('sinon');
const omit = require('lodash/omit');
const pick = require('lodash/pick');
const app = require('../../server');
const Program = require('../../src/models/Program');
const Course = require('../../src/models/Course');
const GCloudStorageHelper = require('../../src/helpers/gCloudStorage');
const {
  populateDB,
  programsList,
  subProgramsList,
  course,
  activitiesList,
  activityHistoriesList,
  categoriesList,
} = require('./seed/programsSeed');
const { getToken } = require('./seed/authenticationSeed');
const { generateFormData } = require('./utils');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('PROGRAMS ROUTES - POST /programs', () => {
  let token;
  beforeEach(populateDB);

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      token = await getToken('vendor_admin');
    });

    it('should create program', async () => {
      const categoryId = categoriesList[0]._id;
      const response = await app.inject({
        method: 'POST',
        url: '/programs',
        headers: { 'x-access-token': token },
        payload: { name: 'program', categories: [categoryId] },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 404 if wrong category id', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/programs',
        headers: { 'x-access-token': token },
        payload: { name: 'program', categories: [new ObjectID()] },
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
        token = await getToken(role.name);
        const categoryId = categoriesList[0]._id;
        const response = await app.inject({
          method: 'POST',
          url: '/programs',
          headers: { 'x-access-token': token },
          payload: { name: 'program', categories: [categoryId] },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('PROGRAMS ROUTES - GET /programs', () => {
  let authToken = null;
  beforeEach(populateDB);

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should get all programs', async () => {
      const programsNumber = programsList.length;
      const response = await app.inject({
        method: 'GET',
        url: '/programs',
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.programs.length).toEqual(programsNumber);
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
          method: 'GET',
          url: '/programs',
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('PROGRAMS ROUTES - GET /programs/e-learning', () => {
  let authToken = null;
  beforeEach(populateDB);

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should get all programs', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/programs/e-learning',
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.programs.length).toEqual(1);
      const coursesIds = response.result.data.programs[0].subPrograms[0].courses.map(c => c._id);

      const courses = await Course.find({ _id: { $in: coursesIds } }).lean();
      expect(courses.every(c => c.format === 'strictly_e_learning')).toBeTruthy();
    });

    it('should return 401 if user is not connected', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/programs/e-learning',
        headers: { 'x-access-token': '' },
      });

      expect(response.statusCode).toBe(401);
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
      { name: 'trainer', expectedCode: 200 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: '/programs/e-learning',
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('PROGRAMS ROUTES - GET /programs/{_id}/user', () => {
  let authToken = null;
  beforeEach(populateDB);

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should get a program', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/programs/${programsList[1]._id}/user`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.program).toMatchObject({
        _id: programsList[1]._id,
        name: 'training program',
        subPrograms: [{
          _id: subProgramsList[2]._id,
          name: 'c\'est un sous-programme elearning',
          courses: [{
            _id: course._id,
            trainees: course.trainees,
            subProgram: subProgramsList[2]._id,
          }],
          steps: [{ activities: [{ _id: activitiesList[0]._id, activityHistories: [activityHistoriesList[0]] }] }],
        }],
      });
    });

    it('should return 404 if program does not exists', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/programs/${new ObjectID()}/user`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 401 if user is not connected', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/programs/${programsList[1]._id}/user`,
        headers: { 'x-access-token': '' },
      });

      expect(response.statusCode).toBe(401);
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
      { name: 'trainer', expectedCode: 200 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: '/programs/e-learning',
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('PROGRAMS ROUTES - GET /programs/{_id}', () => {
  let authToken = null;
  beforeEach(populateDB);

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should get program', async () => {
      const programId = programsList[0]._id;
      const response = await app.inject({
        method: 'GET',
        url: `/programs/${programId.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.program).toMatchObject({
        _id: programId,
        name: 'program',
        subPrograms: [{
          name: 'c\'est un sous-programme',
          steps: [{
            type: 'on_site',
            name: 'encore une étape',
            areActivitiesValid: true,
            activities: [{
              name: 'c\'est une activité',
              type: 'sharing_experience',
              areCardsValid: true,
            }],
          }],
        }],
      });
    });

    it('should return 404 if program does not exists', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/programs/${new ObjectID()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should get program with non valid activities and non valid steps', async () => {
      const programId = programsList[2]._id;
      const response = await app.inject({
        method: 'GET',
        url: `/programs/${programId.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.program).toMatchObject({
        _id: programId,
        name: 'non valid program',
        subPrograms: [{
          name: 'c\'est un sous-programme',
          steps: [{
            type: 'on_site',
            name: 'encore une étape',
            areActivitiesValid: false,
            activities: [{ areCardsValid: false }],
          }],
        }],
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
        authToken = await getToken(role.name);
        const programId = programsList[0]._id;
        const response = await app.inject({
          method: 'GET',
          url: `/programs/${programId.toHexString()}`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('PROGRAMS ROUTES - PUT /programs/{_id}', () => {
  let authToken = null;
  beforeEach(populateDB);
  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should update program', async () => {
      const programId = programsList[0]._id;
      const payload = { name: 'new name', description: 'On apprend des trucs\nc\'est chouette' };

      const response = await app.inject({
        method: 'PUT',
        url: `/programs/${programId.toHexString()}`,
        payload,
        headers: { 'x-access-token': authToken },
      });

      const programUpdated = await Program.findById(programId);

      expect(response.statusCode).toBe(200);
      expect(programUpdated._id).toEqual(programId);
      expect(programUpdated.name).toEqual('new name');
      expect(programUpdated.description).toEqual('On apprend des trucs\nc\'est chouette');
    });

    it('should return 404 if program does not exist', async () => {
      const payload = { name: 'new name', description: 'On apprend des trucs\nc\'est chouette' };
      const response = await app.inject({
        method: 'PUT',
        url: `/programs/${new ObjectID()}`,
        payload,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 400 if payload is empty', async () => {
      const programId = programsList[0]._id;
      const response = await app.inject({
        method: 'PUT',
        url: `/programs/${programId.toHexString()}`,
        payload: {},
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(400);
    });

    const falsyParams = ['name', 'description', 'learningGoals'];
    falsyParams.forEach((param) => {
      it(`should return a 400 if ${param} is equal to '' `, async () => {
        const programId = programsList[0]._id;
        const payload = { name: 'new name', description: 'Trop top', learningGoals: 'Truc chouette' };
        const response = await app.inject({
          method: 'PUT',
          url: `/programs/${programId.toHexString()}`,
          payload: { ...payload, [param]: '' },
          headers: { 'x-access-token': authToken },
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
        authToken = await getToken(role.name);
        const programId = programsList[0]._id;
        const response = await app.inject({
          method: 'PUT',
          payload: { learningGoals: 'On apprend des trucs\nc\'est chouette' },
          url: `/programs/${programId.toHexString()}`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('PROGRAMS ROUTES - POST /programs/{_id}/subprogram', () => {
  let authToken = null;
  beforeEach(populateDB);
  const payload = { name: 'new subProgram' };

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should create subProgram', async () => {
      const programId = programsList[0]._id;
      const subProgramLengthBefore = programsList[0].subPrograms.length;
      const response = await app.inject({
        method: 'POST',
        url: `/programs/${programId.toHexString()}/subprograms`,
        payload,
        headers: { 'x-access-token': authToken },
      });

      const programUpdated = await Program.findById(programId);

      expect(response.statusCode).toBe(200);
      expect(programUpdated._id).toEqual(programId);
      expect(programUpdated.subPrograms.length).toEqual(subProgramLengthBefore + 1);
    });

    it('should return 404 if program does not exist', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/programs/${new ObjectID()}/subprograms`,
        payload,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 400 if missing name', async () => {
      const programId = programsList[0]._id;
      const response = await app.inject({
        method: 'POST',
        url: `/programs/${programId.toHexString()}/subprograms`,
        payload: omit(payload, 'name'),
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 if program does not exist', async () => {
      const invalidId = new ObjectID();
      const response = await app.inject({
        method: 'POST',
        url: `/programs/${invalidId}/subprograms`,
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
        const programId = programsList[0]._id;
        const response = await app.inject({
          method: 'POST',
          payload,
          url: `/programs/${programId.toHexString()}/subprograms`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('POST /programs/:id/upload', () => {
  let authToken;
  let form;
  let uploadMedia;
  const program = programsList[0];
  const docPayload = { fileName: 'program_image_test', file: 'true' };
  beforeEach(() => {
    form = generateFormData(docPayload);
    uploadMedia = sinon.stub(GCloudStorageHelper, 'uploadProgramMedia');
  });
  afterEach(() => {
    uploadMedia.restore();
  });

  describe('VENDOR_ADMIN', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should add a program image', async () => {
      uploadMedia.returns({ publicId: 'abcdefgh', link: 'https://alenvi.io' });

      const response = await app.inject({
        method: 'POST',
        url: `/programs/${program._id}/upload`,
        payload: await GetStream(form),
        headers: { ...form.getHeaders(), 'x-access-token': authToken },
      });

      const programUpdated = await Program.findById(program._id, { name: 1, image: 1 }).lean();

      expect(response.statusCode).toBe(200);
      expect(programUpdated).toMatchObject({
        ...pick(program, ['_id', 'name']),
        image: { publicId: 'abcdefgh', link: 'https://alenvi.io' },
      });
      sinon.assert.calledOnce(uploadMedia);
    });

    it('should return 404 if program does not exist', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/programs/${new ObjectID()}/upload`,
        payload: await GetStream(form),
        headers: { ...form.getHeaders(), 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(404);
    });

    const wrongParams = ['file', 'fileName'];
    wrongParams.forEach((param) => {
      it(`should return a 400 error if missing '${param}' parameter`, async () => {
        const invalidForm = generateFormData(omit(docPayload, param));
        const response = await app.inject({
          method: 'POST',
          url: `/programs/${program._id}/upload`,
          payload: await GetStream(invalidForm),
          headers: { ...invalidForm.getHeaders(), 'x-access-token': authToken },
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
        authToken = await getToken(role.name);
        uploadMedia.returns({ publicId: 'abcdefgh', link: 'https://alenvi.io' });

        const response = await app.inject({
          method: 'POST',
          url: `/programs/${program._id}/upload`,
          payload: await GetStream(form),
          headers: { ...form.getHeaders(), 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
