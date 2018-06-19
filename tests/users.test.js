// const { expect } = require('code');
// const Lab = require('lab');
const { ObjectID } = require('mongodb');

// const { before, describe, it } = exports.lab = Lab.script();
const expect = require('expect');
// const request = require('supertest');

const app = require('../server');
const User = require('../models/User');
const { userList, populateUsers } = require('./seed/usersSeed');

describe('NON-PROTECTED ROUTES', () => {
  before(populateUsers);
  describe('POST /users', () => {
    let res = null;
    let user = null;
    let userPayload = null;
    it('should create an user', async () => {
      userPayload = {
        firstname: 'Test',
        lastname: 'Test',
        local: {
          email: 'test1@alenvi.io',
          password: '123456'
        },
        role: 'Auxiliaire'
      };
      res = await app.inject({
        method: 'POST',
        url: '/users',
        payload: userPayload
      });
      console.log(typeof res.result.data.user._id);
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
    });
    it('should create an user with default picture if not provided', () => {
      expect(user).toHaveProperty('picture');
      expect(user.picture.link).toBe('https://res.cloudinary.com/alenvi/image/upload/c_scale,h_400,q_auto,w_400/v1513764284/images/users/default_avatar.png');
    });
    // it('should create an user with a google drive folder if it is an auxiliary', () => {
    //   if (res.body.data.user.role.name === 'Auxiliaire') {
    //     expect(user.administrative).toHaveProperty('driveFolder');
    //     expect(user.administrative.driveFolder).toHaveProperty('id');
    //     expect(user.administrative.driveFolder.id).toBeDefined();
    //     expect(user.administrative.driveFolder.link).toBeDefined();
    //   }
    // });
    // it('should create an user with a refreshToken', () => {
    //   expect(user.refreshToken).toBeDefined();
    // });
    // it('should respond with a populated user role', () => {
    //   expect(res.body.data.user).toHaveProperty('role');
    //   expect(res.body.data.user.role).toEqual(expect.objectContaining({ name: userPayload.role }));
    // });
    // it('should not create an user if missing parameters', async () => {
    //   delete userPayload.role;
    //   const response = await request(app).post('/users').send(userPayload);
    //   expect(response.statusCode).toBe(400);
    // });
    // it('should not create an user if role provided does not exist', async () => {
    //   userPayload.role = 'Toto';
    //   const response = await request(app).post('/users').send(userPayload);
    //   expect(response.statusCode).toBe(404);
    // });
    // it('should not create an user if email provided already exists', () => {
    //   const userPayload2 = {
    //     firstname: 'Test',
    //     lastname: 'Test',
    //     local: {
    //       email: 'test1@alenvi.io',
    //       password: '123456'
    //     },
    //     role: 'Auxiliaire'
    //   };
    //   expect(async () => {
    //     const response = await request(app).post('/users').send(userPayload2);
    //     expect(response).toThrow();
    //     expect(response.statusCode).toBe(409);
    //   });
    // });
  });

  // describe('POST /users/authenticate', () => {
  //   it('should authenticate an user', async () => {
  //     const credentials = {
  //       email: 'test1@alenvi.io',
  //       password: '123456'
  //     };

  //     const res = await request(app).post('/users/authenticate').send(credentials);
  //     expect(res.statusCode).toBe(200);
  //     expect(res.body.data).toEqual(expect.objectContaining({
  //       token: expect.any(String),
  //       refreshToken: expect.any(String),
  //       expiresIn: expect.any(Number),
  //       user: expect.objectContaining({ _id: expect.any(String), role: expect.any(String) })
  //     }));
  //   });
  //   it('should authenticate an user if email has capitals', async () => {
  //     const credentials = {
  //       email: 'Test1@alenvi.io',
  //       password: '123456'
  //     };
  //     const res = await request(app).post('/users/authenticate').send(credentials);
  //     expect(res.statusCode).toBe(200);
  //   });
  //   it('should not authenticate an user if missing parameter', async () => {
  //     const credentials = {
  //       email: 'test1@alenvi.io'
  //     };
  //     const res = await request(app).post('/users/authenticate').send(credentials);
  //     expect(res.statusCode).toBe(400);
  //   });
  //   it('should not authenticate an user if user does not exist', async () => {
  //     const credentials = {
  //       email: 'test@alenvi.io',
  //       password: '123456'
  //     };
  //     const res = await request(app).post('/users/authenticate').send(credentials);
  //     expect(res.statusCode).toBe(404);
  //   });
  //   it('should not authenticate an user if wrong password', async () => {
  //     const credentials = {
  //       email: 'test1@alenvi.io',
  //       password: '7890'
  //     };
  //     const res = await request(app).post('/users/authenticate').send(credentials);
  //     expect(res.statusCode).toBe(401);
  //   });
  //   it('should not authenticate an user if refreshToken is missing', async () => {
  //     const credentials = {
  //       email: 'test2@alenvi.io',
  //       password: '123456'
  //     };
  //     const res = await request(app).post('/users/authenticate').send(credentials);
  //     expect(res.statusCode).toBe(403);
  //   });
  // });
});

// describe('PROTECTED ROUTES', async () => {
//   let token = null;
//   before(async () => {
//     const credentials = {
//       email: 'test3@alenvi.io',
//       password: '123456'
//     };
//     const response = await request(app).post('/users/authenticate').send(credentials);
//     token = response.body.data.token;
//   });
//   describe('GET /users', () => {
//     it('should get all users', async () => {
//       const res = await request(app).get('/users').set('x-access-token', token);
//       expect(res.statusCode).toBe(200);
//       expect(res.body.data.users.length).toBe(3);
//     });
//     it('should populate users with roles and features', async () => {
//       const res = await request(app).get('/users').set('x-access-token', token);
//       expect(res.statusCode).toBe(200);
//       expect(res.body.data.users[0]).toHaveProperty('role');
//       expect(res.body.data.users[0].role).toEqual(expect.objectContaining({
//         _id: expect.any(String),
//         name: expect.any(String),
//         features: expect.any(Array)
//       }));
//     });
//   });
//   describe('GET /users/:id', () => {
//     it('should return user', async () => {
//       const res = await request(app).get(`/users/${userList[0]._id.toHexString()}`).set('x-access-token', token);
//       expect(res.statusCode).toBe(200);
//       expect(res.body.data.user).toBeDefined();
//       expect(res.body.data.user).toEqual(expect.objectContaining({
//         firstname: userList[0].firstname,
//         lastname: userList[0].lastname,
//         local: expect.objectContaining({ email: userList[0].local.email }),
//         role: expect.objectContaining({ name: userList[0].role })
//       }));
//     });
//     it('should return a 404 error if no user found', async () => {
//       const id = new ObjectID().toHexString();
//       const res = await request(app).get(`/users/${id}`).set('x-access-token', token);
//       expect(res.statusCode).toBe(404);
//     });
//   });
//   describe('PUT /users/:id/', () => {
//     it('should update the user', async () => {
//       const updatePayload = {
//         firstname: 'Riri',
//         local: {
//           email: 'riri@alenvi.io',
//           password: '098765'
//         },
//         role: 'Tech',
//       };
//       const res = await request(app).put(`/users/${userList[0]._id.toHexString()}`).send(updatePayload).set('x-access-token', token);
//       expect(res.statusCode).toBe(200);
//       expect(res.body.data.userUpdated).toBeDefined();
//       expect(res.body.data.userUpdated).toEqual(expect.objectContaining({
//         _id: expect.any(String),
//         firstname: updatePayload.firstname,
//         local: expect.objectContaining({ email: updatePayload.local.email, password: expect.any(String) }),
//         role: expect.objectContaining({ name: updatePayload.role })
//       }));

//       const updatedUser = await User.findById(res.body.data.userUpdated._id).populate({ path: 'role' });
//       expect(updatedUser.firstname).toBe(updatePayload.firstname);
//       expect(updatedUser.local.email).toBe(updatePayload.local.email);
//       expect(updatedUser.role.name).toBe(updatePayload.role);
//     });
//     it('should return a 404 error if no user found', async () => {
//       const id = new ObjectID().toHexString();
//       const res = await request(app).put(`/users/${id}`).send({}).set('x-access-token', token);
//       expect(res.statusCode).toBe(404);
//     });
//   });
// });

