const nodemailer = require('nodemailer');
const NodemailerHelper = require('./nodemailer');
const EmailOptionsHelper = require('./emailOptions');
const { SENDER_MAIL } = require('./constants');

exports.sendEmail = async mailOptions => (process.env.NODE_ENV === 'production'
  ? NodemailerHelper.sendinBlueTransporter.sendMail(mailOptions)
  : NodemailerHelper.testTransporter(await nodemailer.createTestAccount()).sendMail(mailOptions));

exports.billAlertEmail = async (receiver, company) => {
  const companyName = company.tradeName;
  const mailOptions = {
    from: `Compani <${SENDER_MAIL}>`,
    to: receiver,
    subject: `Nouvelle facture ${companyName}`,
    html: await EmailOptionsHelper.billEmail(companyName),
  };

  return exports.sendEmail(mailOptions);
};

exports.completeBillScriptEmail = async (sentNb, emails = null) => {
  const mailOptions = {
    from: `Compani <${SENDER_MAIL}>`,
    to: process.env.TECH_EMAILS,
    subject: 'Script envoi factures',
    html: EmailOptionsHelper.completeBillScriptEmailBody(sentNb, emails),
  };

  return exports.sendEmail(mailOptions);
};

exports.completeEventRepScriptEmail = async (nb, repIds = null) => {
  const mailOptions = {
    from: `Compani <${SENDER_MAIL}>`,
    to: process.env.TECH_EMAILS,
    subject: 'Script traitement répétitions',
    html: EmailOptionsHelper.completeEventRepScriptEmailBody(nb, repIds),
  };

  return exports.sendEmail(mailOptions);
};

exports.completeRoleUpdateScriptEmail = async (nb) => {
  const mailOptions = {
    from: `Compani <${SENDER_MAIL}>`,
    to: process.env.TECH_EMAILS,
    subject: 'Script traitement mis à jour des roles',
    html: EmailOptionsHelper.completeEventRepScriptEmailBody(nb),
  };

  return exports.sendEmail(mailOptions);
};

exports.helperWelcomeEmail = async (receiver, company) => {
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
