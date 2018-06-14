const uuidv4 = require('uuid/v4');
const { ObjectID } = require('mongodb');

const User = require('../../models/User');
const Gdrive = require('../../models/Uploader/GoogleDrive');

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
    firstname: 'Test3',
    lastname: 'Test3',
    local: {
      email: 'test3@alenvi.io',
      password: '123456'
    },
    refreshToken: uuidv4(),
    role: 'Tech'
  }
];

const populateUsers = async () => {
  const users = await User.find();
  if (users.length > 0) {
    for (let i = 0, l = users.length; i < l; i++) {
      if (users[i].administrative && users[i].administrative.driveFolder && users[i].administrative.driveFolder.id) {
        try {
          await Gdrive.deleteFile({ fileId: users[i].administrative.driveFolder.id });
        } catch (e) {
          console.error(e);
        }
      }
    }
    await User.remove({});
  }
  await new User(userList[0]).saveWithRoleId(userList[0].role);
  await new User(userList[1]).saveWithRoleId(userList[1].role);
};

module.exports = { userList, populateUsers };
