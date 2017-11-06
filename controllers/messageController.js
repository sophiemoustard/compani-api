const translate = require('../helpers/translate');
const User = require('../models/User');
const Message = require('../models/Message');
const { redirectToBot } = require('../models/Bot/bot');

const language = translate.language;

const getAllMessages = async (req, res) => {
  try {
    const messages = await Message.find({});
    if (messages.length === 0) {
      return res.status(404).json({ success: false, message: translate[language].getAllMessagesNotFound });
    }
    return res.status(200).json({ success: true, message: translate[language].getAllMessagesFound, data: { messages } });
  } catch (e) {
    console.error(e.message);
    return res.status(500).send({ success: false, message: `Erreur: ${translate[language].unexpectedBehavior}` });
  }
};

const getMessagesBySenderId = async (req, res) => {
  try {
    if (!req.params._id) {
      return res.status(400).send({ success: false, message: `Erreur: ${translate[language].missingParameters}` });
    }
    const messages = await Message.find({ senderId: req.params._id });
    if (messages.length === 0) {
      return res.status(404).json({ success: false, message: translate[language].getAllMessagesNotFound });
    }
    return res.status(200).json({ success: true, message: translate[language].getAllMessagesFound, data: { messages } });
  } catch (e) {
    console.error(e);
    return res.status(500).send({ success: false, message: `Erreur: ${translate[language].unexpectedBehavior}` });
  }
};

const storeMessage = async (req, res) => {
  try {
    if (!req.body.message || !req.query.senderId || !req.body.sectors) {
      return res.status(400).send({ success: false, message: `Erreur: ${translate[language].missingParameters}` });
    }
    const payload = {
      senderId: req.query.senderId,
      content: req.body.message,
      sectors: req.body.sectors
    };
    const message = new Message(payload);
    await message.save();
    return res.status(200).send({ success: true, message: translate[language].storeMessage, data: { message } });
  } catch (e) {
    console.error(e.message);
    return res.status(500).send({ success: false, message: `Erreur: ${translate[language].unexpectedBehavior}` });
  }
};

const sendMessageById = async (req, res) => {
  try {
    if (!req.params._id || !req.query.recipientId) {
      return res.status(400).send({ success: false, message: `Erreur: ${translate[language].missingParameters}` });
    }
    const userAddressRaw = await User.findUserAddressById(req.query.recipientId);
    if (!userAddressRaw) {
      return res.status(404).send({ success: false, message: translate[language].userAddressNotFound });
    }
    const userAddress = userAddressRaw.facebook.address;
    const message = await Message.findOne({ _id: req.params._id });
    if (!message) {
      return res.status(404).send({ success: false, message: translate[language].messageNotFound });
    }
    const sentMessage = await redirectToBot(userAddress, message.content);
    return res.status(200).send({ success: true, message: translate[language].sentMessageToUserBot, data: { user: sentMessage } });
  } catch (e) {
    console.error(e.message);
    return res.status(500).send({ success: false, message: `Erreur: ${translate[language].unexpectedBehavior}` });
  }
};

const addMessageRecipientById = async (req, res) => {
  try {
    if (!req.params._id || req.body.success === undefined || !req.body.recipientId) {
      return res.status(400).send({ success: false, message: `Erreur: ${translate[language].missingParameters}` });
    }
    const payload = {
      id: req.body.recipientId,
      success: req.body.success
    };
    const updatedMessage = await Message.findOneAndUpdate({ _id: req.params._id }, { $push: { recipients: payload } }, { new: true });
    if (!updatedMessage) {
      return res.status(404).send({ success: false, message: translate[language].messageNotFound });
    }
    return res.status(200).send({ success: true, message: translate[language].messageRecipientUpdated, data: { message: updatedMessage } });
  } catch (e) {
    console.error(e.message);
    return res.status(500).send({ success: false, message: `Erreur: ${translate[language].unexpectedBehavior}` });
  }
};

module.exports = { getAllMessages, getMessagesBySenderId, storeMessage, sendMessageById, addMessageRecipientById };
