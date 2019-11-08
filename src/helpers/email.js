const nodemailer = require('nodemailer');
const NodemailerHelper = require('./nodemailer');
const EmailOptionsHelper = require('./emailOptions');
const { SENDER_MAIL } = require('./constants');

const billAlertEmail = async (receiver, company) => {
  const companyName = company.tradeName || company.name;
  const mailOptions = {
    from: `Compani <${SENDER_MAIL}>`,
    to: receiver,
    subject: `Nouvelle facture ${companyName}`,
    html: await EmailOptionsHelper.billEmail(companyName),
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

const completeEventRepScriptEmail = async (nb, repIds = null) => {
  const mailOptions = {
    from: `Compani <${SENDER_MAIL}>`,
    to: process.env.TECH_EMAILS,
    subject: 'Script traitement répétitions',
    html: EmailOptionsHelper.completeEventRepScriptEmailBody(nb, repIds),
  };

  const mailInfo = process.env.NODE_ENV === 'production'
    ? await NodemailerHelper.sendinBlueTransporter.sendMail(mailOptions)
    : await NodemailerHelper.testTransporter(await nodemailer.createTestAccount()).sendMail(mailOptions);

  return mailInfo;
};

const helperWelcomeEmail = async (receiver, company) => {
  const companyName = company.tradeName || company.name;
  const mailOptions = {
    from: `Compani <${SENDER_MAIL}>`,
    to: receiver.email,
    subject: `${companyName} - Bienvenue dans votre espace Compani`,
    html: EmailOptionsHelper.welcomeEmailContent(receiver, companyName),
  };

  return process.env.NODE_ENV !== 'test'
    ? NodemailerHelper.sendinBlueTransporter.sendMail(mailOptions)
    : NodemailerHelper.testTransporter(await nodemailer.createTestAccount()).sendMail(mailOptions);
};

module.exports = {
  billAlertEmail,
  completeBillScriptEmail,
  completeEventRepScriptEmail,
  helperWelcomeEmail,
};
