const expect = require('expect');
const app = require('../../server');
const SubProgram = require('../../src/models/SubProgram');
const { populateDB, subProgramsList } = require('./seed/subProgramsSeed');
const { getToken } = require('./seed/authenticationSeed');


describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('SUBPROGRAMS ROUTES - PUT /subprograms/{_id}', () => {
  let authToken = null;
  beforeEach(populateDB);
  const subProgramId = subProgramsList[0]._id;
  const payload = { name: 'un autre nom pour le sous-programme' };

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should update subProgram', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/subprograms/${subProgramId.toHexString()}`,
        payload,
        headers: { 'x-access-token': authToken },
      });

      const subProgramUpdated = await SubProgram.findById(subProgramId);

      expect(response.statusCode).toBe(200);
      expect(subProgramUpdated).toEqual(expect.objectContaining({ _id: subProgramId, name: payload.name }));
    });

    it('should return a 400 if name is empty', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/subprograms/${subProgramId.toHexString()}`,
        payload: { name: '' },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(400);
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
          method: 'PUT',
          payload,
          url: `/subprograms/${subProgramId.toHexString()}`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
