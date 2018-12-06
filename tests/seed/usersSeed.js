const uuidv4 = require('uuid/v4');
const { ObjectID } = require('mongodb');

const User = require('../../models/User');
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
    employee_id: 12345678,
    sector: '*',
    refreshToken: uuidv4(),
    role: 'Tech'
  },
  {
    _id: new ObjectID(),
    firstname: 'Test5',
    lastname: 'Test5',
    local: {
      email: 'test5@alenvi.io',
      password: '123456'
    },
    refreshToken: uuidv4(),
    role: 'Tech'
  },
  {
    _id: new ObjectID(),
    firstname: 'Test6',
    lastname: 'Test6',
    local: {
      email: 'test6@alenvi.io',
      password: '123456'
    },
    employee_id: 12345678,
    refreshToken: uuidv4(),
    role: 'Auxiliaire'
  },
  {
    _id: new ObjectID(),
    firstname: 'Test7',
    lastname: 'Test7',
    local: {
      email: 'test7@alenvi.io',
      password: '123456'
    },
    inactivityDate: null,
    employee_id: 12345678,
    refreshToken: uuidv4(),
    role: 'Auxiliaire',
    administrative: {
      contracts: [
        {
          creationDate: "2018-12-04T16:34:04.144Z",
          endDate: null,
          ogustContractId: "429068718",
          startDate: "2018-12-03T23:00:00.000Z",
          status: "Prestataire",
          _id: new ObjectID(),
          versions: [
            {
              creationDate: "2018-12-04T16:34:04.144Z",
              endDate: null,
              grossHourlyRate: 10.28,
              isActive: true,
              ogustContractId: "429068718",
              startDate: "2018-12-03T23:00:00.000Z",
              weeklyHours: 9,
              _id: new ObjectID(),
            },
          ],
        },
      ],
    },
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
  await User.remove({});
  await new User(userList[0]).saveByParams({ role: userList[0].role });
  await new User(userList[1]).saveByParams({ role: userList[1].role });
  await new User(userList[2]).saveByParams({ role: userList[2].role });
  await new User(userList[3]).saveByParams({ role: userList[3].role });
  await new User(userList[4]).saveByParams({ role: userList[3].role });
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

module.exports = {
  userList,
  userPayload,
  populateUsers,
  getToken
};
