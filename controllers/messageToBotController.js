const Boom = require('boom');

const translate = require('../helpers/translate');
const User = require('../models/User');
const MessageToBot = require('../models/MessageToBot');
const { redirectToBot } = require('../models/Bot/bot');

const { language } = translate;

const list = async (req) => {
  try {
    const messages = await MessageToBot.find(req.query);
    if (messages.length === 0) {
      return {
        message: translate[language].getAllMessagesNotFound,
        data: { messages: [] }
      };
    }
    return { message: translate[language].getAllMessagesFound, data: { messages } };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

const storeMessage = async (req) => {
  try {
    const message = new MessageToBot(req.payload);
    await message.save();
    return { message: translate[language].storeMessage, data: { message } };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

const getById = async (req) => {
  try {
    const message = await MessageToBot.findOne({ _id: req.params._id });
    if (!message) {
      return Boom.notFound(translate[language].messageNotFound);
    }
    return { message: 'Message Found', data: { message } };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

const sendMessageById = async (req) => {
  try {
    const userAddressRaw = await User.findOne({ _id: req.payload.recipientId, 'facebook.address': { $exists: true } }, { 'facebook.address': 1 });
    if (!userAddressRaw) {
      return Boom.notFound(translate[language].userAddressNotFound);
    }
    const userAddress = userAddressRaw.facebook.address;
    const sentMessage = await redirectToBot({ address: userAddress, message: req.payload.message });
    return { message: sentMessage.data, data: { message: req.payload.message } };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

const addMessageRecipientById = async (req) => {
  try {
    const payload = {
      id: req.payload.recipientId,
      success: req.payload.success
    };
    const updatedMessage = await MessageToBot.findOneAndUpdate({ _id: req.params._id }, { $push: { recipients: payload } }, { new: true });
    if (!updatedMessage) {
      return Boom.notFound(translate[language].messageNotFound);
    }
    return { message: translate[language].messageRecipientUpdated, data: { message: updatedMessage } };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

module.exports = {
  list,
  getById,
  storeMessage,
  sendMessageById,
  addMessageRecipientById
};
