const nodemailer = require('nodemailer');
const NodemailerHelper = require('./nodemailer');
const EmailOptionsHelper = require('./emailOptions');
const { SENDER_MAIL } = require('./constants');

const billAlertEmail = async (receiver) => {
  const mailOptions = {
    from: `Compani <${SENDER_MAIL}>`,
    to: receiver,
    subject: 'Nouvelle facture Alenvi',
    html: EmailOptionsHelper.billEmail(),
  };

  const mailInfo = process.env.NODE_ENV === 'production'
    ? await NodemailerHelper.sendinBlueTransporter.sendMail(mailOptions)
    : await NodemailerHelper.testTransporter(await nodemailer.createTestAccount()).sendMail(mailOptions);

  return mailInfo;
};

const completeBillScriptEmail = async (sentNb, emails = null) => {
  const mailOptions = {
    from: `Compani <${SENDER_MAIL}>`,
    to: process.env.TECH_EMAILS,
    subject: 'Script envoi factures',
    html: EmailOptionsHelper.completeBillScriptEmailBody(sentNb, emails),
  };

  const mailInfo = process.env.NODE_ENV === 'production'
    ? await NodemailerHelper.sendinBlueTransporter.sendMail(mailOptions)
    : await NodemailerHelper.testTransporter(await nodemailer.createTestAccount()).sendMail(mailOptions);

  return mailInfo;
};

module.exports = {
  billAlertEmail,
  completeBillScriptEmail,
};
