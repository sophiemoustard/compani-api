const { ObjectID } = require('mongodb');
const expect = require('expect');
const app = require('../../server');
const User = require('../../models/User');
const {
  userList, userPayload, populateUsers, getToken
} = require('./seed/usersSeed');
const { populateRoles, rolesList } = require('./seed/rolesSeed');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('USERS ROUTES', () => {
  let authToken = null;
  before(populateRoles);
  beforeEach(populateUsers);
  beforeEach(async () => {
    authToken = await getToken();
  });

  describe('POST /users', () => {
    let res = null;
    let user = null;
    it('should not create a user if missing parameters', async () => {
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
    it('should create a user', async () => {
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
      expect(user.identity.lastname).toBe(userPayload.identity.lastname);
      expect(user.local.email).toBe(userPayload.local.email);
      expect(user.local.password).toBeDefined();
      expect(user).toHaveProperty('picture');
    });
    it('should not create a user if role provided does not exist', async () => {
      userPayload.role = 'Toto';
      const response = await app.inject({
        method: 'POST',
        url: '/users',
        payload: userPayload
      });
      expect(response.statusCode).toBe(404);
    });
    it('should not create a user if email provided already exists', () => {
      const userPayload2 = {
        idenity: {
          firstname: 'Test',
          lastname: 'Test',
        },
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
    it('should authenticate a user', async () => {
      const credentials = {
        email: 'test4@alenvi.io',
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
    it('should authenticate a user if email has capitals', async () => {
      const credentials = {
        email: 'Test4@alenvi.io',
        password: '123456'
      };
      const res = await app.inject({
        method: 'POST',
        url: '/users/authenticate',
        payload: credentials
      });
      expect(res.statusCode).toBe(200);
    });
    it('should not authenticate a user if missing parameter', async () => {
      const credentials = {
        email: 'test4@alenvi.io'
      };
      const res = await app.inject({
        method: 'POST',
        url: '/users/authenticate',
        payload: credentials
      });
      expect(res.statusCode).toBe(400);
    });
    it('should not authenticate a user if user does not exist', async () => {
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
    it('should not authenticate a user if wrong password', async () => {
      const credentials = {
        email: 'test4@alenvi.io',
        password: '7890'
      };
      const res = await app.inject({
        method: 'POST',
        url: '/users/authenticate',
        payload: credentials
      });
      expect(res.statusCode).toBe(401);
    });
    it('should not authenticate a user if refreshToken is missing', async () => {
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
      expect(res.result.data.users.length).toBeGreaterThan(0);
      expect(res.result.data.users[0]).toHaveProperty('role');
      expect(res.result.data.users[0].role.toHexString()).toEqual(expect.any(String));
    });
    it('should get all coachs users', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/users?role=Coach',
        headers: { 'x-access-token': authToken },
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.users[0]).toHaveProperty('role');
      expect(res.result.data.users[0].role.toHexString()).toEqual(rolesList[2]._id.toHexString());
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

  describe('GET /users/active', () => {
    it('should get all active users', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/users/active',
        headers: { 'x-access-token': authToken }
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.users[0]).toHaveProperty('isActive');
      expect(res.result.data.users[0].isActive).toBeTruthy();
    });
    it('should get all active coachs users', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/users/active?role=Coach',
        headers: { 'x-access-token': authToken },
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.users[0]).toHaveProperty('role');
      expect(res.result.data.users[0].role.toHexString()).toEqual(rolesList[2]._id.toHexString());
      expect(res.result.data.users[0]).toHaveProperty('isActive');
      expect(res.result.data.users[0].isActive).toBeTruthy();
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
        identity: expect.objectContaining({
          firstname: userList[0].identity.firstname,
          lastname: userList[0].identity.lastname,
        }),
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
        identity: {
          firstname: 'Riri',
        },
        local: {
          email: 'riri@alenvi.io',
          password: '098765'
        },
        role: rolesList[0]._id,
      };
      const res = await app.inject({
        method: 'PUT',
        url: `/users/${userList[0]._id.toHexString()}`,
        payload: updatePayload,
        headers: { 'x-access-token': authToken }
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.userUpdated).toBeDefined();
      expect(res.result.data.userUpdated).toMatchObject({
        _id: userList[0]._id,
        identity: expect.objectContaining({
          firstname: updatePayload.identity.firstname,
        }),
        local: expect.objectContaining({ email: updatePayload.local.email, password: expect.any(String) }),
        role: { _id: updatePayload.role }
      });
      const updatedUser = await User.findById(res.result.data.userUpdated._id).populate({ path: 'role' });
      expect(updatedUser.identity.firstname).toBe(updatePayload.identity.firstname);
      expect(updatedUser.local.email).toBe(updatePayload.local.email);
      expect(updatedUser.role._id).toEqual(updatePayload.role);
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
      const res = await app.inject({
        method: 'DELETE',
        url: `/users/${userList[3]._id}`,
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
        email: 'test4@alenvi.io',
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

  // describe('POST /users/forgotPassword', () => {
  //   let res = null;
  //   before(async () => {
  //     res = await app.inject({
  //       method: 'POST',
  //       url: '/users/forgotPassword',
  //       payload: {
  //         email: userList[2].local.email,
  //         from: 'w'
  //       }
  //     });
  //   });

  //   it('should provide the user with a resetPassword token/expire date/from', async () => {
  //     const user = await User.findById(userList[2]._id);
  //     expect(user.resetPassword).toEqual(expect.objectContaining({
  //       token: expect.any(String),
  //       expiresIn: expect.any(Date),
  //       from: expect.any(String)
  //     }));
  //   });

  //   it('should send an email containing reset token to user', async () => {
  //     expect(res.statusCode).toBe(200);
  //     expect(res.result.data.mailInfo).toEqual(expect.objectContaining({
  //       accepted: [userList[2].local.email]
  //     }));
  //     const emailUrl = nodemailer.getTestMessageUrl(res.result.data.mailInfo);
  //     const emailRaw = await axios.get(emailUrl);
  //     const email = emailRaw.data;
  //     const user = await User.findById(userList[2]._id);
  //     expect(email).toMatch(new RegExp(user.resetPassword.token));
  //   });

  //   const missingParamsTest = [{
  //     name: 'email',
  //     payload: { from: 'w' }
  //   }, {
  //     name: 'from',
  //     payload: { email: userList[2].local.email }
  //   }];
  //   missingParamsTest.forEach((test) => {
  //     it(`should return a 400 error if missing '${test.name}' parameter`, async () => {
  //       const response = await app.inject({
  //         method: 'POST',
  //         url: '/users/forgotPassword',
  //         payload: test.payload
  //       });
  //       expect(response.statusCode).toBe(400);
  //     });
  //   });

  //   it('should return a 404 error if email provided does not exist in db', async () => {
  //     const response = await app.inject({
  //       method: 'POST',
  //       url: '/users/forgotPassword',
  //       payload: { email: 'toto@alenvi.fr', from: 'w' }
  //     });
  //     expect(response.statusCode).toBe(404);
  //   });
  // });

  // describe('GET /checkResetPasswordToken/{token}', () => {
  //   it('should check if token is valid', async () => {
  //     const user = await User.findById(userList[2]._id);
  //     const res = await app.inject({
  //       method: 'GET',
  //       url: `/users/checkResetPassword/${user.resetPassword.token}`
  //     });
  //     expect(res.statusCode).toBe(200);
  //     expect(res.result.data).toEqual(expect.objectContaining({
  //       token: expect.any(String),
  //       user: expect.objectContaining({
  //         _id: userList[2]._id,
  //         email: userList[2].local.email,
  //         role: expect.any(String),
  //         from: expect.any(String)
  //       })
  //     }));
  //   });

  //   it('should return a 404 error if token is not found', async () => {
  //     const res = await app.inject({
  //       method: 'GET',
  //       url: '/users/checkResetPassword/123456'
  //     });
  //     expect(res.statusCode).toBe(404);
  //   });
  // });
});
