const { ObjectID } = require('mongodb');
const expect = require('expect');

const app = require('../server');
const User = require('../models/User');
const { userList, populateUsers } = require('./seed/usersSeed');
const { populateRoles, rolesList } = require('./seed/rolesSeed');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('BOT ROUTES', () => {
  beforeEach(populateRoles);
  beforeEach(populateUsers);

  describe('POST /bot/authorize', () => {
    it('should authenticate an user', async () => {
      const credentials = {
        email: userList[1].local.email,
        password: userList[1].local.password
      };
      const response = await app.inject({
        method: 'POST',
        url: '/bot/authorize',
        payload: credentials
      });
      expect(response.statusCode).toBe(200);
      expect(response.result.data).toEqual(expect.objectContaining({
        token: expect.any(String),
        user: expect.objectContaining({
          _id: expect.any(Object),
          role: rolesList[0]._id,
          firstname: userList[1].lastname,
          lastname: userList[1].lastname,
          employee_id: userList[1].employee_id,
          sector: userList[1].sector
        })
      }));
    });
    it('should authenticate an user if email has capitals', async () => {
      const credentials = {
        email: 'Test4@alenvi.io',
        password: '123456'
      };
      const res = await app.inject({
        method: 'POST',
        url: '/bot/authorize',
        payload: credentials
      });
      expect(res.statusCode).toBe(200);
    });
    it('should not authenticate an user if missing parameter', async () => {
      const credentials = {
        email: 'test1@alenvi.io'
      };
      const res = await app.inject({
        method: 'POST',
        url: '/bot/authorize',
        payload: credentials
      });
      expect(res.statusCode).toBe(400);
    });
    it('should not authenticate an user if user does not exist', async () => {
      const credentials = {
        email: 'test@alenvi.io',
        password: '123456'
      };
      const res = await app.inject({
        method: 'POST',
        url: '/bot/authorize',
        payload: credentials
      });
      expect(res.statusCode).toBe(404);
    });
    it('should not authenticate an user if wrong password', async () => {
      const credentials = {
        email: 'test4@alenvi.io',
        password: '7890'
      };
      const res = await app.inject({
        method: 'POST',
        url: '/bot/authorize',
        payload: credentials
      });
      expect(res.statusCode).toBe(401);
    });
    it('should not authenticate an user if refreshToken is missing', async () => {
      const credentials = {
        email: 'test2@alenvi.io',
        password: '123456'
      };
      const res = await app.inject({
        method: 'POST',
        url: '/bot/authorize',
        payload: credentials
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('GET /bot/user/{_id}', () => {
    it('should return user', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/bot/user/${userList[1]._id}`,
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.user).toBeDefined();
      expect(res.result.data.user).toEqual(expect.objectContaining({
        firstname: userList[1].firstname,
        lastname: userList[1].lastname,
        local: expect.objectContaining({ email: userList[1].local.email }),
        role: userList[1].role,
        employee_id: userList[1].employee_id,
        sector: userList[1].sector,
        token: expect.any(String),
        administrative: expect.any(Object)
      }));
    });
    it('should return a 404 error if no user found', async () => {
      const id = new ObjectID().toHexString();
      const res = await app.inject({
        method: 'GET',
        url: `/bot/user/${id}`,
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /bot/user', async () => {
    it('should get all users', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/bot/users',
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.users.length).toBe(4);
    });
  });
});
