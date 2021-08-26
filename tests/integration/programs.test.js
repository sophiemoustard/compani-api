const expect = require('expect');
const GetStream = require('get-stream');
const { ObjectID } = require('mongodb');
const sinon = require('sinon');
const omit = require('lodash/omit');
const pick = require('lodash/pick');
const app = require('../../server');
const Program = require('../../src/models/Program');
const GCloudStorageHelper = require('../../src/helpers/gCloudStorage');
const {
  populateDB,
  programsList,
  categoriesList,
  course,
} = require('./seed/programsSeed');
const { getToken, getTokenByCredentials } = require('./helpers/authentication');
const { generateFormData } = require('./utils');
const { trainerOrganisationManager, noRoleNoCompany } = require('../seed/authUsersSeed');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('PROGRAMS ROUTES - POST /programs', () => {
  let authToken;
  beforeEach(populateDB);

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should create program', async () => {
      const categoryId = categoriesList[0]._id;
      const response = await app.inject({
        method: 'POST',
        url: '/programs',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { name: 'program', categories: [categoryId] },
      });

      const programCountAfter = await Program.countDocuments();
      expect(response.statusCode).toBe(200);
      expect(programCountAfter).toEqual(programsList.length + 1);
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
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
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
  let authToken;
  beforeEach(populateDB);

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should get all programs', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/programs',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.programs.length).toEqual(programsList.length);
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
          url: '/programs',
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('PROGRAMS ROUTES - GET /programs/e-learning', () => {
  let authToken;
  beforeEach(populateDB);

  describe('LOGGED_USER', () => {
    beforeEach(async () => {
      authToken = await getTokenByCredentials(noRoleNoCompany.local);
    });

    it('should get all e-learning programs', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/programs/e-learning',
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.programs._id).toEqual(course.id);
    });
  });
});

describe('PROGRAMS ROUTES - GET /programs/{_id}', () => {
  let authToken;
  beforeEach(populateDB);

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should get program', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/programs/${programsList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.program._id).toEqual(programsList[0]._id);
    });

    it('should return 404 if program does not exists', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/programs/${new ObjectID()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should get a program even if activities and steps are non valid', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/programs/${programsList[2]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.program._id).toEqual(programsList[2]._id);
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
  let authToken;
  beforeEach(populateDB);

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should update program', async () => {
      const payload = { name: 'mis a jour', description: 'On apprend des trucs\nc\'est chouette' };

      const response = await app.inject({
        method: 'PUT',
        url: `/programs/${programsList[0]._id}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      const programUpdatedCount = await Program.countDocuments(
        { _id: programsList[0]._id, name: 'mis a jour', description: 'On apprend des trucs\nc\'est chouette' }
      );
      expect(response.statusCode).toBe(200);
      expect(programUpdatedCount).toEqual(1);
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

    ['name', 'description', 'learningGoals'].forEach((param) => {
      it(`should return a 400 if ${param} is empty `, async () => {
        const payload = { name: 'new name', description: 'Trop top', learningGoals: 'Truc chouette' };
        const response = await app.inject({
          method: 'PUT',
          url: `/programs/${programsList[0]._id}`,
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
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
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
  let authToken;
  beforeEach(populateDB);
  const payload = { name: 'new subProgram' };

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should create subProgram', async () => {
      const subProgramCountBefore = programsList[0].subPrograms.length;
      const response = await app.inject({
        method: 'POST',
        url: `/programs/${programsList[0]._id}/subprograms`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      const programUpdated = await Program.findById(programsList[0]._id).lean();

      expect(response.statusCode).toBe(200);
      expect(programUpdated.subPrograms.length).toEqual(subProgramCountBefore + 1);
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

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
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

      const programUpdated = await Program.countDocuments(
        { _id: program._id, image: { link: 'https://alenvi.io', publicId: 'abcdefgh' } }
      );

      expect(response.statusCode).toBe(200);
      expect(programUpdated).toEqual(1);
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

    ['file', 'fileName'].forEach((param) => {
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
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
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

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should delete a program media', async () => {
      const imageExistsBeforeUpdate = await Program
        .countDocuments({ _id: programsList[0]._id, 'image.publicId': { $exists: true } });

      const response = await app.inject({
        method: 'DELETE',
        url: `/programs/${programsList[0]._id}/upload`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      sinon.assert.calledOnceWithExactly(deleteProgramMediaStub, 'au revoir');

      const isPictureDeleted = await Program.countDocuments(
        { _id: programsList[0]._id, 'image.publicId': { $exists: false } }
      );
      expect(imageExistsBeforeUpdate).toBeTruthy();
      expect(isPictureDeleted).toBeTruthy();
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
          url: `/programs/${programsList[0]._id}/upload`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('PROGRAMS ROUTES - POST /programs/{_id}/categories', () => {
  let authToken;
  beforeEach(populateDB);
  const payload = { categoryId: categoriesList[1]._id };

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should add category', async () => {
      const categoryLengthBefore = programsList[0].categories.length;
      const response = await app.inject({
        method: 'POST',
        url: `/programs/${programsList[0]._id.toHexString()}/categories`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      const programUpdated = await Program.findById(programsList[0]._id).lean();

      expect(response.statusCode).toBe(200);
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
        url: `/programs/${programsList[0]._id}/categories`,
        payload: { categoryId: new ObjectID() },
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
          method: 'POST',
          payload,
          url: `/programs/${programsList[0]._id}/categories`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('PROGRAMS ROUTES - DELETE /programs/{_id}/categories/{_id}', () => {
  let authToken;
  beforeEach(populateDB);

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should remove category from program', async () => {
      const categoryLengthBefore = programsList[0].categories.length;

      const response = await app.inject({
        method: 'DELETE',
        url: `/programs/${programsList[0]._id}/categories/${programsList[0].categories[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      const programUpdated = await Program.findOne({ _id: programsList[0]._id }).lean();

      expect(response.statusCode).toBe(200);
      expect(programUpdated.categories.length).toEqual(categoryLengthBefore - 1);
    });

    it('should return a 404 if program does not exist', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/programs/${new ObjectID()}/categories/${programsList[0].categories[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 404 if program does not contain category', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/programs/${programsList[0]._id}/categories/${new ObjectID()}`,
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

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should add a tester to a program', async () => {
      const payload = {
        identity: { lastname: 'test', firstname: 'test' },
        local: { email: 'test@alenvi.io' },
        contact: { phone: '0123456789' },
      };

      const response = await app.inject({
        method: 'POST',
        url: `/programs/${programsList[0]._id}/testers`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(200);
      const program = await Program.findById(programsList[0]._id).lean();
      expect(program.testers.length).toEqual(1);
    });

    it('should add an existing user as tester to a program', async () => {
      const payload = pick(
        trainerOrganisationManager,
        ['local.email', 'identity.firstname', 'identity.lastname', 'contact.phone']
      );

      const response = await app.inject({
        method: 'POST',
        url: `/programs/${programsList[0]._id}/testers`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(200);
      const program = await Program.findById(programsList[0]._id).lean();
      expect(program.testers.length).toEqual(1);
    });

    it('should return a 404 if program does not exist', async () => {
      const payload = pick(
        trainerOrganisationManager,
        ['local.email', 'identity.firstname', 'identity.lastname', 'contact.phone']
      );

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
        url: `/programs/${programsList[0]._id}/testers`,
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
        url: `/programs/${programsList[0]._id}/testers`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 if phone is missing', async () => {
      const payload = {
        identity: { firstname: 'test', lastname: 'oiuy' },
        local: { email: 'test@alenvi.io' },
      };

      const response = await app.inject({
        method: 'POST',
        url: `/programs/${programsList[0]._id}/testers`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 409 if user is already a tester for this program', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/programs/${programsList[1]._id}/testers`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: pick(trainerOrganisationManager, 'local.email'),
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
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

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should remove a tester to a program', async () => {
      const programBefore = await Program.findById(programsList[1]._id).lean();

      const response = await app.inject({
        method: 'DELETE',
        url: `/programs/${programsList[1]._id}/testers/${trainerOrganisationManager._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const program = await Program.findById(programsList[1]._id).lean();
      expect(program.testers.length).toEqual(programBefore.testers.length - 1);
    });

    it('should return a 404 if program does not exist', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/programs/${new ObjectID()}/testers/${trainerOrganisationManager._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 409 if tester is not in program', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/programs/${programsList[0]._id}/testers/${trainerOrganisationManager._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'trainer', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'DELETE',
          url: `/programs/${programsList[1]._id}/testers/${trainerOrganisationManager._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
