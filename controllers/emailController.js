const Boom = require('boom');
const nodemailer = require('nodemailer');
const translate = require('../helpers/translate');
const { sendGridTransporter, testTransporter } = require('../helpers/nodemailer');
const { welcomeEmailContent, welcomeAuxiliaryEmailContent } = require('../helpers/emailOptions');
const { SENDER_MAIL } = require('../helpers/constants');

const { language } = translate;

const sendWelcome = async (req) => {
  try {
    const mailOptions = {
      from: `Alenvi <${SENDER_MAIL}>`,
      to: req.payload.receiver.email,
      subject: 'Alenvi - Bienvenue dans votre espace Compani',
      html: welcomeEmailContent(req.payload.receiver),
    };
    const mailInfo = process.env.NODE_ENV !== 'test'
      ? await sendGridTransporter.sendMail(mailOptions)
      : await testTransporter(await nodemailer.createTestAccount()).sendMail(mailOptions);

    return { message: translate[language].emailSent, data: { mailInfo } };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

const sendAuxiliaryWelcome = async (req) => {
  try {
    const mailOptions = {
      from: `Alenvi <${SENDER_MAIL}>`,
      to: req.payload.email,
      subject: 'Bienvenue chez Alenvi ! :)',
      html: welcomeAuxiliaryEmailContent(),
    };
    const mailInfo = process.env.NODE_ENV !== 'test'
      ? await sendGridTransporter.sendMail(mailOptions)
      : await testTransporter(await nodemailer.createTestAccount()).sendMail(mailOptions);

    return { message: translate[language].emailSent, data: { mailInfo } };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

module.exports = {
  sendWelcome,
  sendAuxiliaryWelcome,
};

