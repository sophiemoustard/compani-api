const uuidv4 = require('uuid/v4');
const { ObjectID } = require('mongodb');

const User = require('../../models/User');
const Gdrive = require('../../models/Uploader/GoogleDrive');
const app = require('../../server');

const userList = [
  {
    _id: new ObjectID(),
    firstname: 'Test2',
    lastname: 'Test2',
    local: {
      email: 'test2@alenvi.io',
      password: '123456'
    },
    role: 'Coach'
  },
  {
    _id: new ObjectID(),
    firstname: 'Test4',
    lastname: 'Test4',
    local: {
      email: 'test4@alenvi.io',
      password: '123456'
    },
    refreshToken: uuidv4(),
    role: 'Tech'
  }
];

const userPayload = {
  firstname: 'Test',
  lastname: 'Test',
  local: {
    email: 'test1@alenvi.io',
    password: '123456'
  },
  role: 'Auxiliaire'
};

const populateUsers = async () => {
  console.log('POPULATING USERS...');
  const users = await User.find();
  if (users.length > 0 && users.length < 3) {
    for (let i = 0, l = users.length; i < l; i++) {
      if (users[i].administrative && users[i].administrative.driveFolder && users[i].administrative.driveFolder.id) {
        try {
          await Gdrive.deleteFile({ fileId: users[i].administrative.driveFolder.id });
        } catch (e) {
          console.error(e);
        }
      }
    }
  }
  await User.remove({});
  await new User(userList[0]).saveByRoleName(userList[0].role);
  await new User(userList[1]).saveByRoleName(userList[1].role);
};

const getToken = async () => {
  const credentials = {
    email: 'test4@alenvi.io',
    password: '123456'
  };
  const response = await app.inject({
    method: 'POST',
    url: '/users/authenticate',
    payload: credentials
  });
  return response.result.data.token;
};

module.exports = { userList, userPayload, populateUsers, getToken };
