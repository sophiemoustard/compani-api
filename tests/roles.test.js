const expect = require('expect');
const { ObjectID } = require('mongodb');

const app = require('../server');
const { getToken, populateUsers } = require('./seed/usersSeed');
const {
  populateRoles,
  rolePayload,
  wrongRolePayload,
  rolesList
} = require('./seed/rolesSeed');
const Role = require('../models/Role');

describe('ROLES ROUTES', () => {
  let token = null;
  beforeEach(populateRoles);
  beforeEach(populateUsers);
  beforeEach(async () => {
    token = await getToken();
  });
  describe('POST /roles', () => {
    it('should create a role', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/roles',
        payload: rolePayload,
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.role).toEqual(expect.objectContaining({
        _id: expect.any(String),
        name: rolePayload.name,
        features: expect.arrayContaining([
          {
            _id: rolePayload.features[0]._id,
            [rolePayload.features[0].name]: rolePayload.features[0].permission_level
          },
          {
            _id: rolePayload.features[1]._id,
            [rolePayload.features[1].name]: rolePayload.features[1].permission_level
          },
          {
            _id: rolePayload.features[2]._id,
            [rolePayload.features[2].name]: rolePayload.features[2].permission_level
          }
        ])
      }));
      const role = await Role.findById(res.result.data.role._id);
      expect(role.name).toBe(rolePayload.name);
      expect(role.features).toEqual(expect.arrayContaining([
        expect.objectContaining({
          feature_id: rolePayload.features[0]._id,
          permission_level: rolePayload.features[0].permission_level
        }),
        expect.objectContaining({
          feature_id: rolePayload.features[1]._id,
          permission_level: rolePayload.features[1].permission_level
        }),
        expect.objectContaining({
          feature_id: rolePayload.features[2]._id,
          permission_level: rolePayload.features[2].permission_level
        })
      ]));
    });

    it('should return a 400 error if missing payload', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/roles',
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(400);
    });

    it('should return a 400 error if features permission level are wrong', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/roles',
        payload: wrongRolePayload,
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(400);
    });

    it('should return a 409 error if role already exists', async () => {
      const payload = {
        name: rolesList[0].name,
        features: rolesList[0].features
      };
      const res = await app.inject({
        method: 'POST',
        url: '/roles',
        payload,
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(409);
    });
  });

  describe('PUT /roles/{_id}', () => {
    it('should update role', async () => {
      const payload = {
        name: 'Kokonut',
        features: [
          {
            _id: rolesList[0].features[0].feature_id,
            permission_level: 0
          },
          {
            _id: rolesList[1].features[1].feature_id,
            permission_level: 1
          },
        ]
      };
      const res = await app.inject({
        method: 'PUT',
        url: `/roles/${rolesList[0]._id}`,
        payload,
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.role).toEqual(expect.objectContaining({
        _id: rolesList[0]._id,
        name: payload.name,
        features: expect.arrayContaining([
          expect.objectContaining({
            _id: payload.features[0]._id,
            permission_level: payload.features[0].permission_level
          }),
          expect.objectContaining({
            _id: payload.features[1]._id,
            permission_level: payload.features[1].permission_level
          })
        ])
      }));
    });
    it('should return a 404 error if role id does not exist', async () => {
      const payload = {
        name: 'Kokonut',
        features: [
          {
            _id: rolesList[0].features[0].feature_id,
            permission_level: 0
          },
          {
            _id: rolesList[1].features[1].feature_id,
            permission_level: 1
          },
        ]
      };
      const res = await app.inject({
        method: 'PUT',
        url: `/roles/${new ObjectID()}`,
        payload,
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(404);
    });
    it('should return a 400 error if id is not valid', async () => {
      const payload = {
        name: 'Kokonut',
        features: [
          {
            _id: rolesList[0].features[0].feature_id,
            permission_level: 0
          },
        ]
      };
      const res = await app.inject({
        method: 'PUT',
        url: '/roles/123456',
        payload,
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /roles', () => {
    it('should return all roles', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/roles',
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.roles.length).toBe(4);
      expect(res.result.data.roles[0]).toEqual(expect.objectContaining({
        name: expect.any(String),
        features: expect.arrayContaining([
          expect.objectContaining({
            name: expect.any(String),
            permission_level: expect.any(Number)
          })
        ])
      }));
    });

    it('should return a 400 error if query parameter does not exist', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/roles?toto=test',
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /roles/{_id}', () => {
    it('should return role', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/roles/${rolesList[0]._id}`,
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.role).toEqual(expect.objectContaining({
        name: expect.any(String),
        features: expect.arrayContaining([
          expect.objectContaining({
            _id: rolesList[0].features[0].feature_id,
            permission_level: rolesList[0].features[0].permission_level
          }),
          expect.objectContaining({
            _id: rolesList[0].features[1].feature_id,
            permission_level: rolesList[0].features[1].permission_level
          }),
          expect.objectContaining({
            _id: rolesList[0].features[2].feature_id,
            permission_level: rolesList[0].features[2].permission_level
          })
        ])
      }));
    });

    it('should return a 404 error if role does not exist', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/roles/${new ObjectID()}`,
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(404);
    });

    it('should return a 400 error if id is not valid', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/roles/123456',
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('DELETE /role/{_id}', () => {
    it('should delete role', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/roles/${rolesList[1]._id}`,
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(200);
      const role = await Role.findById(rolesList[1]._id);
      expect(role).toBeNull();
    });

    it('should return a 404 error if role does not exist', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/roles/${new ObjectID()}`,
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(404);
    });

    it('should return a 400 error if id is not valid', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/roles/123456',
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(400);
    });
  });
});
