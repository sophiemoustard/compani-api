const expect = require('expect');
const { ObjectID } = require('mongodb');

const app = require('../../server');
const { getToken, populateUsers } = require('./seed/usersSeed');
const { populateRoles, rightPayload, rightsList } = require('./seed/rolesSeed');
const Role = require('../../models/Role');
const Right = require('../../models/Right');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('RIGHTS ROUTES', () => {
  let token = null;
  beforeEach(populateRoles);
  beforeEach(populateUsers);
  beforeEach(async () => {
    token = await getToken();
  });

  describe('POST /rights', () => {
    let res = null;
    beforeEach(async () => {
      res = await app.inject({
        method: 'POST',
        url: '/rights',
        payload: rightPayload,
        headers: { 'x-access-token': token }
      });
    });
    it('should create a right', async () => {
      expect(res.statusCode).toBe(200);
      expect(res.result.data.right).toEqual(expect.objectContaining({
        name: rightPayload.name,
        permission: rightPayload.permission,
        description: rightPayload.description
      }));

      const right = await Right.findById(res.result.data.right._id);
      expect(right).toEqual(expect.objectContaining({
        name: rightPayload.name,
        permission: rightPayload.permission,
        description: rightPayload.description
      }));
    });

    it('should add right and no access to all existing roles exept admin', async () => {
      const roles = await Role.find({}, {}, { autopopulate: false });
      roles.filter(role => !role.name.match(/^admin$/i)).forEach((role) => {
        expect(role.rights).toEqual(expect.arrayContaining([
          expect.objectContaining({
            right_id: res.result.data.right._id,
            hasAccess: false
          })
        ]));
      });
    });

    it('should add right to admin role with access', async () => {
      const admin = await Role.find({ name: 'admin' }, {}, { autopopulate: false });
      expect(admin[0].rights).toEqual(expect.arrayContaining([
        expect.objectContaining({
          right_id: res.result.data.right._id,
          hasAccess: true
        })
      ]));
    });

    it("should return a 400 error if 'permission' param is missing", async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/rights',
        payload: { name: 'Test Right' },
        headers: { 'x-access-token': token }
      });
      expect(response.statusCode).toBe(400);
    });

    it('should return a 409 error if right already exists', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/rights',
        payload: { name: 'Test', permission: 'test:read' },
        headers: { 'x-access-token': token }
      });
      expect(response.statusCode).toBe(409);
    });
  });

  describe('PUT /rights/{_id}', () => {
    it('should update a right', async () => {
      const payload = { name: 'Kokonut' };
      const res = await app.inject({
        method: 'PUT',
        url: `/rights/${rightsList[0]._id}`,
        payload,
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.right.name).toBe(payload.name);

      const right = await Right.findById(res.result.data.right._id);
      expect(right.name).toBe(payload.name);
    });

    it('should return a 400 error if no payload', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/rights/${rightsList[0]._id}`,
        payload: {},
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(400);
    });

    it('should return a 409 error if right name already exists', async () => {
      const payload = { name: 'right2' };
      const res = await app.inject({
        method: 'PUT',
        url: `/rights/${rightsList[0]._id}`,
        payload,
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(409);
    });
  });

  describe('GET /rights', () => {
    it('should return all rights', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/rights',
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.rights.length).toBe(4);
    });

    it('should return rights according to query param', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/rights?name=right1',
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.rights[0].name).toBe('right1');
    });

    it('should return an empty list if no rights are found', async () => {
      await Right.deleteMany({});
      const res = await app.inject({
        method: 'GET',
        url: '/rights',
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.rights).toEqual([]);
    });

    it('should return a 400 error if bad parameters are passed', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/rights?test=toto',
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /rights/{_id}', () => {
    it('should return a right', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/rights/${rightsList[0]._id}`,
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.right).toEqual(expect.objectContaining({
        name: rightsList[0].name,
        permission: rightsList[0].permission,
        description: rightsList[0].description
      }));
    });

    it('should return a 400 error if id is invalid', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/rights/123456',
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(400);
    });

    it('should return a 404 error if right does not exist', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/rights/${new ObjectID()}`,
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('DELETE /rights/{_id}', () => {
    let res = null;
    beforeEach(async () => {
      res = await app.inject({
        method: 'DELETE',
        url: `/rights/${rightsList[0]._id}`,
        headers: { 'x-access-token': token }
      });
    });
    it('should delete a right', async () => {
      expect(res.statusCode).toBe(200);
      const right = await Right.findById(rightsList[0]._id);
      expect(right).toBeNull();
    });

    it('should delete right from all roles', async () => {
      const roles = await Role.find({}, {}, { autopopulate: false });
      roles.forEach((role) => {
        expect(role.rights).toEqual(expect.not.arrayContaining([
          { right_id: rightsList[0]._id }
        ]));
      });
    });

    it('should return a 400 error if id is invalid', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/rights/123456',
        headers: { 'x-access-token': token }
      });
      expect(response.statusCode).toBe(400);
    });

    it('should return a 404 error if right does not exist', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/rights/${new ObjectID()}`,
        headers: { 'x-access-token': token }
      });
      expect(response.statusCode).toBe(404);
    });
  });
});
