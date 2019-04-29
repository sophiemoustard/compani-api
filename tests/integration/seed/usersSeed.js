const uuidv4 = require('uuid/v4');
const { ObjectID } = require('mongodb');

const User = require('../../../models/User');
const app = require('../../../server');
const { sectorsList } = require('./sectorsSeed');
const { companiesList } = require('./companiesSeed');

const userList = [
  {
    _id: new ObjectID(),
    identity: {
      firstname: 'Test2',
      lastname: 'Test2',
    },
    local: {
      email: 'test2@alenvi.io',
      password: '123456'
    },
    role: 'Coach',
    inactivityDate: null,
  },
  {
    _id: new ObjectID(),
    identity: {
      firstname: 'Test4',
      lastname: 'Test4',
    },
    local: {
      email: 'test4@alenvi.io',
      password: '123456'
    },
    employee_id: 12345678,
    sector: sectorsList[0]._id,
    refreshToken: uuidv4(),
    company: companiesList[0].name,
    role: 'Tech',
    inactivityDate: '2018-11-01T12:52:27.461Z',
  },
  {
    _id: new ObjectID(),
    identity: {
      firstname: 'Test5',
      lastname: 'Test5',
    },
    local: {
      email: 'test5@alenvi.io',
      password: '123456'
    },
    refreshToken: uuidv4(),
    role: 'Tech',
    inactivityDate: '2018-11-01T12:52:27.461Z',
  },
  {
    _id: new ObjectID(),
    identity: {
      firstname: 'Test6',
      lastname: 'Test6',
    },
    local: {
      email: 'test6@alenvi.io',
      password: '123456'
    },
    employee_id: 12345678,
    refreshToken: uuidv4(),
    role: 'Auxiliaire',
    inactivityDate: '2018-11-01T12:52:27.461Z',
  },
  {
    _id: new ObjectID(),
    identity: {
      firstname: 'Test7',
      lastname: 'Test7',
    },
    local: {
      email: 'test7@alenvi.io',
      password: '123456'
    },
    inactivityDate: null,
    employee_id: 12345678,
    refreshToken: uuidv4(),
    role: 'Auxiliaire',
    contracts: [new ObjectID()],
  }
];

const userPayload = {
  identity: {
    firstname: 'Test',
    lastname: 'Test',
  },
  local: {
    email: 'test1@alenvi.io',
    password: '123456'
  },
  role: 'Auxiliaire',
  company: companiesList[0].name,
};

const populateUsers = async () => {
  await User.deleteMany({});
  await new User(userList[0]).saveByParams({ role: userList[0].role });
  await new User(userList[1]).saveByParams({ role: userList[1].role, company: userList[1].company });
  await new User(userList[2]).saveByParams({ role: userList[2].role });
  await new User(userList[3]).saveByParams({ role: userList[3].role });
  await new User(userList[4]).saveByParams({ role: userList[4].role });
};

const getToken = async () => {
  const credentials = {
    email: 'test4@alenvi.io',
    password: '123456',
  };
  const response = await app.inject({
    method: 'POST',
    url: '/users/authenticate',
    payload: credentials,
  });
  return response.result.data.token;
};

module.exports = {
  userList,
  userPayload,
  populateUsers,
  getToken
};
