const nodemailer = require('nodemailer');
const NodemailerHelper = require('./nodemailer');
const EmailOptionsHelper = require('./emailOptions');
const UserHelper = require('./users');
const { SENDER_MAIL, TRAINER, HELPER } = require('./constants');

exports.sendEmail = async mailOptions => (process.env.NODE_ENV === 'production'
  ? NodemailerHelper.sendinBlueTransporter().sendMail(mailOptions)
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
    html: EmailOptionsHelper.completeRoleUpdateScriptEmailBody(nb),
  };

  return exports.sendEmail(mailOptions);
};

exports.sendWelcome = async (type, email, company) => {
  if (type === HELPER) {
    await exports.helperWelcomeEmail(email, company);
  } else if (type === TRAINER) {
    await exports.trainerWelcomeEmail(email, company);
  }
};

exports.trainerWelcomeEmail = async (email) => {
  const passwordToken = await UserHelper.createPasswordToken(email);
  const mailOptions = {
    from: `Compani <${SENDER_MAIL}>`,
    to: email,
    subject: 'Alenvi - Bienvenue dans votre espace Formateur !',
    html: EmailOptionsHelper.trainerWelcomeEmailContent({ passwordToken }),
  };

  return NodemailerHelper.sendinBlueTransporter().sendMail(mailOptions);
};

exports.helperWelcomeEmail = async (email, company) => {
  const companyName = company.tradeName || company.name;
  const passwordToken = await UserHelper.createPasswordToken(email);
  const mailOptions = {
    from: `Compani <${SENDER_MAIL}>`,
    to: email,
    subject: `${companyName} - Bienvenue dans votre espace Compani`,
    html: EmailOptionsHelper.helperWelcomeEmailContent({ companyName, passwordToken }),
  };

  return NodemailerHelper.sendinBlueTransporter().sendMail(mailOptions);
};

exports.forgotPasswordEmail = async (receiver, passwordToken) => {
  const mailOptions = {
    from: `Compani <${SENDER_MAIL}>`,
    to: receiver,
    subject: 'Changement de mot de passe de votre compte Compani',
    html: EmailOptionsHelper.forgotPasswordEmail(passwordToken),
  };

  return NodemailerHelper.sendinBlueTransporter().sendMail(mailOptions);
};
