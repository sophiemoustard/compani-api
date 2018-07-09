const { ObjectID } = require('mongodb');

const { userList } = require('./usersSeed');
const MessageToBot = require('../../models/MessageToBot');

const messagesList = [
  {
    _id: new ObjectID(),
    senderId: userList[0]._id,
    content: 'Ceci est un test.',
    sectors: '1n*'
  },
  {
    _id: new ObjectID(),
    senderId: userList[0]._id,
    content: 'Ceci est un autre test.',
    sectors: ['1l*', '1z*']
  }
];

const messagePayload = {
  senderId: userList[0]._id,
  content: 'TEST',
  sectors: '1p*'
};

const populateMessagesToBot = async () => {
  await MessageToBot.remove({});
  await MessageToBot.insertMany(messagesList);
};


module.exports = { messagesList, messagePayload, populateMessagesToBot };
