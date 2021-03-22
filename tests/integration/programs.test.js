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
  categoriesList,
  vendorAdmin,
} = require('./seed/programsSeed');
const { getToken } = require('./seed/authenticationSeed');
const { generateFormData } = require('./utils');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('PROGRAMS ROUTES - POST /programs', () => {
  let authToken;
  beforeEach(populateDB);

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should create program', async () => {
      const categoryId = categoriesList[0]._id;
      const response = await app.inject({
        method: 'POST',
        url: '/programs',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { name: 'program', categories: [categoryId] },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 404 if wrong category id', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/programs',
        headers: { Cookie: `alenvi_token=${authToken}` },
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
        authToken = await getToken(role.name);
        const categoryId = categoriesList[0]._id;
        const response = await app.inject({
          method: 'POST',
          url: '/programs',
          headers: { Cookie: `alenvi_token=${authToken}` },
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
        headers: { Cookie: `alenvi_token=${authToken}` },
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
          headers: { Cookie: `alenvi_token=${authToken}` },
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
        headers: { Cookie: `alenvi_token=${authToken}` },
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
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should get program with non valid activities and non valid steps', async () => {
      const programId = programsList[2]._id;
      const response = await app.inject({
        method: 'GET',
        url: `/programs/${programId.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
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
          headers: { Cookie: `alenvi_token=${authToken}` },
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
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      const programUpdated = await Program.findById(programId).lean();

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
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 400 if payload is empty', async () => {
      const programId = programsList[0]._id;
      const response = await app.inject({
        method: 'PUT',
        url: `/programs/${programId.toHexString()}`,
        payload: {},
        headers: { Cookie: `alenvi_token=${authToken}` },
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
          headers: { Cookie: `alenvi_token=${authToken}` },
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
          headers: { Cookie: `alenvi_token=${authToken}` },
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
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      const programUpdated = await Program.findById(programId).lean();

      expect(response.statusCode).toBe(200);
      expect(programUpdated._id).toEqual(programId);
      expect(programUpdated.subPrograms.length).toEqual(subProgramLengthBefore + 1);
    });

    it('should return 404 if program does not exist', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/programs/${new ObjectID()}/subprograms`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 400 if missing name', async () => {
      const programId = programsList[0]._id;
      const response = await app.inject({
        method: 'POST',
        url: `/programs/${programId.toHexString()}/subprograms`,
        payload: omit(payload, 'name'),
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 if program does not exist', async () => {
      const invalidId = new ObjectID();
      const response = await app.inject({
        method: 'POST',
        url: `/programs/${invalidId}/subprograms`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
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
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('PROGRAMS ROUTES - POST /programs/:id/upload', () => {
  let authToken;
  let uploadProgramMediaStub;
  const program = programsList[0];
  beforeEach(() => {
    uploadProgramMediaStub = sinon.stub(GCloudStorageHelper, 'uploadProgramMedia');
  });
  afterEach(() => {
    uploadProgramMediaStub.restore();
  });

  describe('VENDOR_ADMIN', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should add a program image', async () => {
      uploadProgramMediaStub.returns({ publicId: 'abcdefgh', link: 'https://alenvi.io' });

      const form = generateFormData({ fileName: 'program_image_test', file: 'true' });
      const response = await app.inject({
        method: 'POST',
        url: `/programs/${program._id}/upload`,
        payload: await GetStream(form),
        headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
      });

      const programUpdated = await Program.findById(program._id, { name: 1, image: 1 }).lean();

      expect(response.statusCode).toBe(200);
      expect(programUpdated).toMatchObject({
        ...pick(program, ['_id', 'name']),
        image: { publicId: 'abcdefgh', link: 'https://alenvi.io' },
      });
      sinon.assert.calledOnceWithExactly(uploadProgramMediaStub, { fileName: 'program_image_test', file: 'true' });
    });

    it('should return 404 if program does not exist', async () => {
      const form = generateFormData({ fileName: 'program_image_test', file: 'true' });
      const response = await app.inject({
        method: 'POST',
        url: `/programs/${new ObjectID()}/upload`,
        payload: await GetStream(form),
        headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    const wrongParams = ['file', 'fileName'];
    wrongParams.forEach((param) => {
      it(`should return a 400 error if missing '${param}' parameter`, async () => {
        const invalidForm = generateFormData(omit({ fileName: 'program_image_test', file: 'true' }, param));
        const response = await app.inject({
          method: 'POST',
          url: `/programs/${program._id}/upload`,
          payload: await GetStream(invalidForm),
          headers: { ...invalidForm.getHeaders(), Cookie: `alenvi_token=${authToken}` },
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
        const form = generateFormData({ fileName: 'program_image_test', file: 'true' });
        authToken = await getToken(role.name);
        uploadProgramMediaStub.returns({ publicId: 'abcdefgh', link: 'https://alenvi.io' });

        const response = await app.inject({
          method: 'POST',
          url: `/programs/${program._id}/upload`,
          payload: await GetStream(form),
          headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('PROGRAMS ROUTES - DELETE /programs/:id/upload', () => {
  let authToken;
  let deleteProgramMediaStub;
  beforeEach(() => {
    deleteProgramMediaStub = sinon.stub(GCloudStorageHelper, 'deleteProgramMedia');
  });
  afterEach(() => {
    deleteProgramMediaStub.restore();
  });

  describe('VENDOR_ADMIN', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should delete a program media', async () => {
      const program = programsList[0];
      const imageExistsBeforeUpdate = await Program
        .countDocuments({ _id: program._id, 'image.publicId': { $exists: true } });

      const response = await app.inject({
        method: 'DELETE',
        url: `/programs/${program._id}/upload`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      sinon.assert.calledOnceWithExactly(deleteProgramMediaStub, 'au revoir');

      const isPictureDeleted = await Program.countDocuments({ _id: program._id, 'image.publicId': { $exists: false } });
      expect(imageExistsBeforeUpdate).toBeTruthy();
      expect(isPictureDeleted).toBeTruthy();
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
        const program = programsList[0];
        const response = await app.inject({
          method: 'DELETE',
          url: `/programs/${program._id}/upload`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('PROGRAMS ROUTES - POST /programs/{_id}/categories', () => {
  let authToken = null;
  beforeEach(populateDB);
  const programId = programsList[0]._id;
  const payload = { categoryId: categoriesList[1]._id };

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should add category', async () => {
      const categoryLengthBefore = programsList[0].categories.length;
      const response = await app.inject({
        method: 'POST',
        url: `/programs/${programId.toHexString()}/categories`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      const programUpdated = await Program.findById(programId).lean();

      expect(response.statusCode).toBe(200);
      expect(programUpdated._id).toEqual(programId);
      expect(programUpdated.categories.length).toEqual(categoryLengthBefore + 1);
    });

    it('should return 404 if program does not exist', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/programs/${new ObjectID()}/categories`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 404 if category does not exist', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/programs/${programId.toHexString()}/categories`,
        payload: { categoryId: new ObjectID() },
        headers: { Cookie: `alenvi_token=${authToken}` },
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
          url: `/programs/${programId.toHexString()}/categories`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('PROGRAMS ROUTES - DELETE /programs/{_id}/categories/{_id}', () => {
  let authToken = null;
  beforeEach(populateDB);

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should remove category from program', async () => {
      const programId = programsList[0]._id;
      const categoryLengthBefore = programsList[0].categories.length;
      const response = await app.inject({
        method: 'DELETE',
        url: `/programs/${programId.toHexString()}/categories/${programsList[0].categories[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      await Program.findById(programId).lean();

      expect(response.statusCode).toBe(200);
      const programUpdated = await Program.findOne({ _id: programId }).lean();
      expect(programUpdated.categories.length).toEqual(categoryLengthBefore - 1);
      expect(programUpdated.categories.some(c => c._id === programsList[0].categories[0]._id)).toBeFalsy();
    });

    it('should return a 404 if program does not exist', async () => {
      const programId = new ObjectID();
      const response = await app.inject({
        method: 'DELETE',
        url: `/programs/${programId}/categories/${programsList[0].categories[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 404 if program does not contain category', async () => {
      const categoryId = new ObjectID();
      const response = await app.inject({
        method: 'DELETE',
        url: `/programs/${programsList[0]._id}/categories/${categoryId}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'training_organisation_manager', expectedCode: 200 },
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'trainer', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const programId = programsList[0]._id;
        const response = await app.inject({
          method: 'DELETE',
          url: `/programs/${programId.toHexString()}/categories/${programsList[0].categories[0]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('PROGRAMS ROUTES - POST /{_id}/testers', () => {
  let authToken;
  beforeEach(populateDB);
  describe('ROF', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should add a tester to a program', async () => {
      const programId = programsList[0]._id;
      const payload = {
        identity: { lastname: 'test', firstname: 'test' },
        local: { email: 'test@alenvi.io' },
        contact: { phone: '0123456789' },
      };

      const response = await app.inject({
        method: 'POST',
        url: `/programs/${programId.toHexString()}/testers`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(200);
      const program = await Program.findById(programId).lean();
      expect(program.testers).toHaveLength(1);
    });

    it('should add an existing user to a program', async () => {
      const programId = programsList[0]._id;
      const payload = pick(vendorAdmin, ['local.email', 'identity.firstname', 'identity.lastname', 'contact.phone']);

      const response = await app.inject({
        method: 'POST',
        url: `/programs/${programId.toHexString()}/testers`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(200);
      const program = await Program.findById(programId).lean();
      expect(program.testers).toHaveLength(1);
    });

    it('should return a 404 if program does not exist', async () => {
      const payload = pick(vendorAdmin, ['local.email', 'identity.firstname', 'identity.lastname', 'contact.phone']);

      const response = await app.inject({
        method: 'POST',
        url: `/programs/${new ObjectID()}/testers`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 400 if missing email', async () => {
      const payload = {
        identity: { lastname: 'test', firstname: 'test' },
        contact: { phone: '0123456789' },
      };

      const response = await app.inject({
        method: 'POST',
        url: `/programs/${programsList[0]._id.toHexString()}/testers`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 if user does not exist and missing lastname', async () => {
      const payload = {
        identity: { firstname: 'test' },
        local: { email: 'test@alenvi.io' },
        contact: { phone: '0123456789' },
      };

      const response = await app.inject({
        method: 'POST',
        url: `/programs/${programsList[0]._id.toHexString()}/testers`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 if user does not exist and missing phone', async () => {
      const payload = {
        identity: { firstname: 'test', lastname: 'oiuy' },
        local: { email: 'test@alenvi.io' },
      };

      const response = await app.inject({
        method: 'POST',
        url: `/programs/${programsList[0]._id.toHexString()}/testers`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 409 if user already is a tester for this program', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/programs/${programsList[1]._id.toHexString()}/testers`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: pick(vendorAdmin, 'local.email'),
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'trainer', expectedCode: 403 },
    ];
    const payload = {
      identity: { lastname: 'test', firstname: 'test' },
      local: { email: 'test@alenvi.io' },
      contact: { phone: '0123456789' },
    };

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'POST',
          url: `/programs/${programsList[0]._id.toHexString()}/testers`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload,
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('PROGRAMS ROUTES - DELETE /{_id}/testers/{testerId}', () => {
  let authToken;
  beforeEach(populateDB);
  describe('ROF', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should remove a tester to a program', async () => {
      const programId = programsList[1]._id;
      const programBefore = await Program.findById(programId).lean();

      const response = await app.inject({
        method: 'DELETE',
        url: `/programs/${programId.toHexString()}/testers/${vendorAdmin._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const program = await Program.findById(programId).lean();
      expect(programBefore.testers).toHaveLength(1);
      expect(program.testers).toHaveLength(0);
    });

    it('should return a 404 if program does not exist', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/programs/${new ObjectID()}/testers/${vendorAdmin._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 422 if tester is not in program', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/programs/${programsList[0]._id}/testers/${vendorAdmin._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(422);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'trainer', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'DELETE',
          url: `/programs/${programsList[1]._id.toHexString()}/testers/${vendorAdmin._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
