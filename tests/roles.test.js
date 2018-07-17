const expect = require('expect');
const { ObjectID } = require('mongodb');

const app = require('../server');
const { getToken, populateUsers } = require('./seed/usersSeed');
const {
  populateRoles,
  rolePayload,
  rightsList,
  rolesList
} = require('./seed/rolesSeed');
const Role = require('../models/Role');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

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
        _id: expect.any(Object),
        name: rolePayload.name,
        rights: expect.arrayContaining([
          expect.objectContaining({
            _id: rolePayload.rights[0].right_id,
            name: rightsList[0].name,
            permission: rightsList[0].permission,
            description: rightsList[0].description,
            hasAccess: rolePayload.rights[0].hasAccess
          }),
          expect.objectContaining({
            _id: rolePayload.rights[1].right_id,
            name: rightsList[1].name,
            permission: rightsList[1].permission,
            description: rightsList[1].description,
            hasAccess: rolePayload.rights[1].hasAccess
          }),
          expect.objectContaining({
            _id: rolePayload.rights[2].right_id,
            name: rightsList[2].name,
            permission: rightsList[2].permission,
            description: rightsList[2].description,
            hasAccess: rolePayload.rights[2].hasAccess
          }),
        ])
      }));
      const role = await Role.findById(res.result.data.role._id, {}, { autopopulate: false });
      expect(role.name).toBe(rolePayload.name);
      expect(role.rights).toEqual(expect.arrayContaining([
        expect.objectContaining({
          right_id: rolePayload.rights[0].right_id,
          hasAccess: rolePayload.rights[0].hasAccess
        }),
        expect.objectContaining({
          right_id: rolePayload.rights[1].right_id,
          hasAccess: rolePayload.rights[1].hasAccess
        }),
        expect.objectContaining({
          right_id: rolePayload.rights[2].right_id,
          hasAccess: rolePayload.rights[2].hasAccess
        })
      ]));
    });

    it('should create a role with existing rights (access to false) if they are not provided', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/roles',
        payload: { name: 'Test' },
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.role).toEqual(expect.objectContaining({
        _id: expect.any(Object),
        name: rolePayload.name,
        rights: expect.arrayContaining([
          expect.objectContaining({
            _id: rightsList[0]._id,
            name: rightsList[0].name,
            permission: rightsList[0].permission,
            description: rightsList[0].description,
            hasAccess: false
          }),
          expect.objectContaining({
            _id: rightsList[1]._id,
            name: rightsList[1].name,
            permission: rightsList[1].permission,
            description: rightsList[1].description,
            hasAccess: false
          }),
          expect.objectContaining({
            _id: rightsList[2]._id,
            name: rightsList[2].name,
            permission: rightsList[2].permission,
            description: rightsList[2].description,
            hasAccess: false
          }),
        ])
      }));
    });

    it('should return a 400 error if missing payload', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/roles',
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(400);
    });

    it('should return a 409 error if role already exists', async () => {
      const payload = {
        name: rolesList[0].name,
        rights: rolesList[0].rights
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
        rights: [
          {
            _id: rolesList[0].rights[0].right_id,
            rolesAllowed: [{
              role_id: rolesList[0]._id,
              name: rolesList[0].name
            }],
            hasAccess: false
          },
          {
            _id: rolesList[1].rights[1].right_id,
            hasAccess: false
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
        rights: expect.arrayContaining([
          expect.objectContaining({
            _id: payload.rights[0]._id,
            hasAccess: payload.rights[0].hasAccess,
            rolesAllowed: expect.arrayContaining([
              expect.objectContaining({
                role_id: payload.rights[0].rolesAllowed[0].role_id,
                name: payload.rights[0].rolesAllowed[0].name
              })
            ])
          }),
          expect.objectContaining({
            _id: payload.rights[1]._id,
            hasAccess: payload.rights[1].hasAccess
          })
        ])
      }));
    });

    it('should return a 404 error if role id does not exist', async () => {
      const payload = {
        name: 'Kokonut',
        rights: [
          {
            _id: rolesList[0].rights[0].right_id,
            hasAccess: false
          },
          {
            _id: rolesList[1].rights[1].right_id,
            hasAccess: false
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
        rights: [
          {
            _id: rolesList[0].rights[0].right_id,
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
        rights: expect.arrayContaining([
          expect.objectContaining({
            name: expect.any(String),
            permission: expect.any(String),
            description: expect.any(String),
            hasAccess: expect.any(Boolean)
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
        rights: expect.arrayContaining([
          expect.objectContaining({
            _id: rolesList[0].rights[0].right_id,
            name: rightsList[0].name,
            permission: rightsList[0].permission,
            description: rightsList[0].description,
            hasAccess: rolesList[0].rights[0].hasAccess
          }),
          expect.objectContaining({
            _id: rolesList[0].rights[1].right_id,
            name: rightsList[1].name,
            permission: rightsList[1].permission,
            description: rightsList[1].description,
            hasAccess: rolesList[0].rights[1].hasAccess
          }),
          expect.objectContaining({
            _id: rolesList[0].rights[2].right_id,
            name: rightsList[2].name,
            permission: rightsList[2].permission,
            description: rightsList[2].description,
            hasAccess: rolesList[0].rights[2].hasAccess
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
