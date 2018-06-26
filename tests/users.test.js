// const { expect } = require('code');
// const Lab = require('lab');
const { ObjectID } = require('mongodb');

// const { before, describe, it } = exports.lab = Lab.script();
const expect = require('expect');
// const request = require('supertest');

const app = require('../server');
const User = require('../models/User');
const {
  userList, userPayload, populateUsers, getToken
} = require('./seed/usersSeed');

describe('USERS ROUTES', () => {
  let authToken = null;
  before(populateUsers);
  before(async () => {
    authToken = await getToken();
  });
  describe('POST /users', () => {
    let res = null;
    let user = null;
    // let userPayload = null;
    it('should not create an user if missing parameters', async () => {
      const tmpRole = userPayload.role;
      delete userPayload.role;
      const response = await app.inject({
        method: 'POST',
        url: '/users',
        payload: userPayload
      });
      userPayload.role = tmpRole;
      expect(response.statusCode).toBe(400);
    });
    it('should create an user', async () => {
      res = await app.inject({
        method: 'POST',
        url: '/users',
        payload: userPayload
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data).toEqual(expect.objectContaining({
        token: expect.any(String),
        refreshToken: expect.any(String),
        expiresIn: expect.any(Number),
        user: expect.objectContaining({
          _id: expect.any(String),
          role: expect.objectContaining({ name: userPayload.role })
        })
      }));
      user = await User.findById(res.result.data.user._id);
      expect(user.firstname).toBe(userPayload.firstname);
      expect(user.lastname).toBe(userPayload.lastname);
      expect(user.local.email).toBe(userPayload.local.email);
      expect(user.local.password).toBeDefined();
      expect(user).toHaveProperty('picture');
      expect(user.picture.link).toBe('https://res.cloudinary.com/alenvi/image/upload/c_scale,h_400,q_auto,w_400/v1513764284/images/users/default_avatar.png');
      if (res.result.data.user.role.name === 'Auxiliaire') {
        expect(user.administrative).toHaveProperty('driveFolder');
        expect(user.administrative.driveFolder).toHaveProperty('id');
        expect(user.administrative.driveFolder.id).toBeDefined();
        expect(user.administrative.driveFolder.link).toBeDefined();
      }
    });
    it('should not create an user if role provided does not exist', async () => {
      userPayload.role = 'Toto';
      const response = await app.inject({
        method: 'POST',
        url: '/users',
        payload: userPayload
      });
      expect(response.statusCode).toBe(404);
    });
    it('should not create an user if email provided already exists', () => {
      const userPayload2 = {
        firstname: 'Test',
        lastname: 'Test',
        local: {
          email: 'test1@alenvi.io',
          password: '123456'
        },
        role: 'Auxiliaire'
      };
      expect(async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/users',
          payload: userPayload2
        });
        expect(response).toThrow('NoRole');
        expect(response.statusCode).toBe(409);
      });
    });
  });

  describe('POST /users/authenticate', () => {
    it('should authenticate an user', async () => {
      const credentials = {
        email: 'test1@alenvi.io',
        password: '123456'
      };
      const response = await app.inject({
        method: 'POST',
        url: '/users/authenticate',
        payload: credentials
      });
      expect(response.statusCode).toBe(200);
      expect(response.result.data).toEqual(expect.objectContaining({
        token: expect.any(String),
        refreshToken: expect.any(String),
        expiresIn: expect.any(Number),
        user: expect.objectContaining({
          _id: expect.any(String),
          role: expect.any(String)
        })
      }));
    });
    it('should authenticate an user if email has capitals', async () => {
      const credentials = {
        email: 'Test1@alenvi.io',
        password: '123456'
      };
      const res = await app.inject({
        method: 'POST',
        url: '/users/authenticate',
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
        url: '/users/authenticate',
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
        url: '/users/authenticate',
        payload: credentials
      });
      expect(res.statusCode).toBe(404);
    });
    it('should not authenticate an user if wrong password', async () => {
      const credentials = {
        email: 'test1@alenvi.io',
        password: '7890'
      };
      const res = await app.inject({
        method: 'POST',
        url: '/users/authenticate',
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
        url: '/users/authenticate',
        payload: credentials
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('GET /users', () => {
    it('should get all users', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/users',
        headers: { 'x-access-token': authToken }
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.users[0]).toHaveProperty('role');
      expect(res.result.data.users[0].role).toEqual(expect.objectContaining({
        _id: expect.any(Object),
        name: expect.any(String),
        features: expect.any(Array)
      }));
    });
    it('should get all coachs users', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/users?role=Coach',
        headers: { 'x-access-token': authToken },
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.users[0]).toHaveProperty('role');
      expect(res.result.data.users[0].role).toEqual(expect.objectContaining({
        _id: expect.any(Object),
        name: expect.any(String),
        features: expect.any(Array)
      }));
    });
    it('should not get users if role given doesn\'t exist', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/users?role=Babouin',
        headers: { 'x-access-token': authToken },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /users/:id', () => {
    it('should return user', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/users/${userList[0]._id.toHexString()}`,
        headers: { 'x-access-token': authToken }
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.user).toBeDefined();
      expect(res.result.data.user).toEqual(expect.objectContaining({
        firstname: userList[0].firstname,
        lastname: userList[0].lastname,
        local: expect.objectContaining({ email: userList[0].local.email }),
        role: expect.objectContaining({ name: userList[0].role })
      }));
    });
    it('should return a 404 error if no user found', async () => {
      const id = new ObjectID().toHexString();
      const res = await app.inject({
        method: 'GET',
        url: `/users/${id}`,
        headers: { 'x-access-token': authToken }
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('PUT /users/:id/', () => {
    it('should update the user', async () => {
      const updatePayload = {
        firstname: 'Riri',
        local: {
          email: 'riri@alenvi.io',
          password: '098765'
        },
        role: 'Tech',
      };
      const res = await app.inject({
        method: 'PUT',
        url: `/users/${userList[0]._id.toHexString()}`,
        payload: updatePayload,
        headers: { 'x-access-token': authToken }
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.userUpdated).toBeDefined();
      expect(res.result.data.userUpdated).toEqual(expect.objectContaining({
        _id: userList[0]._id,
        firstname: updatePayload.firstname,
        local: expect.objectContaining({ email: updatePayload.local.email, password: expect.any(String) }),
        role: expect.objectContaining({ name: updatePayload.role })
      }));
      const updatedUser = await User.findById(res.result.data.userUpdated._id).populate({ path: 'role' });
      expect(updatedUser.firstname).toBe(updatePayload.firstname);
      expect(updatedUser.local.email).toBe(updatePayload.local.email);
      expect(updatedUser.role.name).toBe(updatePayload.role);
    });
    it('should return a 404 error if no user found', async () => {
      const id = new ObjectID().toHexString();
      const res = await app.inject({
        method: 'PUT',
        url: `/users/${id}`,
        payload: {},
        headers: { 'x-access-token': authToken }
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('DELETE /users/:id', () => {
    it('should delete a user by id', async () => {
      const userToDelete = {
        firstname: 'Test',
        lastname: 'Test',
        local: {
          email: 'todelete@alenvi.io',
          password: '123456'
        },
        role: 'Auxiliaire'
      };
      const userCreated = await app.inject({
        method: 'POST',
        url: '/users',
        payload: userToDelete
      });
      const res = await app.inject({
        method: 'DELETE',
        url: `/users/${userCreated.result.data.user._id}`,
        headers: { 'x-access-token': authToken }
      });
      expect(res.statusCode).toBe(200);
    });
    it('should return a 404 error if user is not found', async () => {
      const objectId = new ObjectID();
      const res = await app.inject({
        method: 'DELETE',
        url: `/users/${objectId}`,
        headers: { 'x-access-token': authToken }
      });
      expect(res.statusCode).toBe(404);
    });
    it('should return a 400 error _id query is not an objectId', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/users/123',
        headers: { 'x-access-token': authToken }
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /users/presentation', () => {
    it('should return users presentation by role', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/users/presentation?role=Auxiliaire'
      });
      expect(res.statusCode).toBe(200);
    });
    it('should return a 404 error if no user is found', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/users/presentation'
      });
      expect(res.statusCode).toBe(404);
    });
    it('should return 404 error if role is not found', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/users/presentation?role=RoleInexistant'
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('POST /users/refreshToken', () => {
    it('should return refresh token', async () => {
      const credentials = {
        email: 'test1@alenvi.io',
        password: '123456'
      };
      const user = await app.inject({
        method: 'POST',
        url: '/users/authenticate',
        payload: credentials
      });
      const res = await app.inject({
        method: 'POST',
        url: '/users/refreshToken',
        payload: {
          refreshToken: user.result.data.refreshToken
        }
      });
      expect(res.statusCode).toBe(200);
    });
    it('should return a 404 error when refresh token isn\'t good', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/users/refreshToken',
        payload: {
          refreshToken: 'b171c888-6874-45fd-9c4e-1a9daf0231ba'
        }
      });
      expect(res.statusCode).toBe(404);
    });
  });
});
