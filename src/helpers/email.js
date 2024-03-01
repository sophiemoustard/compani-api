const Boom = require('@hapi/boom');
const nodemailer = require('nodemailer');
const NodemailerHelper = require('./nodemailer');
const EmailOptionsHelper = require('./emailOptions');
const AuthenticationHelper = require('./authentication');
const { SENDER_MAIL, TRAINER, HELPER, COACH, CLIENT_ADMIN, TRAINEE } = require('./constants');
const translate = require('./translate');

const { language } = translate;

exports.sendEmail = async mailOptions => (process.env.NODE_ENV === 'production'
  ? NodemailerHelper.sendinBlueTransporter().sendMail(mailOptions)
  : NodemailerHelper.testTransporter(await nodemailer.createTestAccount()).sendMail(mailOptions));

exports.billAlertEmail = async (receiver, company) => {
  const companyName = company.name;
  const mailOptions = {
    from: `Compani <${SENDER_MAIL}>`,
    to: receiver,
    subject: `Nouvelle facture ${companyName}`,
    html: await EmailOptionsHelper.billEmail(companyName),
  };

  return exports.sendEmail(mailOptions);
};

exports.completeEventRepScriptEmail = async (nb, deletedRepetitions, repIds = null) => {
  const mailOptions = {
    from: `Compani <${SENDER_MAIL}>`,
    to: process.env.TECH_EMAILS,
    subject: 'Script traitement répétitions',
    html: EmailOptionsHelper.completeEventRepScriptEmailBody(nb, deletedRepetitions, repIds),
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

exports.completeEventConsistencyScriptEmail = async (nb) => {
  const mailOptions = {
    from: `Compani <${SENDER_MAIL}>`,
    to: process.env.TECH_EMAILS,
    subject: 'Script bdd consistency',
    html: EmailOptionsHelper.completeEventConsistencyScriptEmailBody(nb),
  };

  return exports.sendEmail(mailOptions);
};

exports.sendWelcome = async (type, email, company) => {
  const passwordToken = await AuthenticationHelper.createPasswordToken(email);

  let companyName;
  let subject = 'Bienvenue dans votre espace Compani';
  let customContent;
  const options = { passwordToken, companyName: 'Compani' };

  if (type === TRAINEE) {
    const mailOptions = {
      from: `Compani <${SENDER_MAIL}>`,
      to: email,
      subject,
      html: EmailOptionsHelper.welcomeTraineeContent(),
    };
    try {
      return NodemailerHelper.sendinBlueTransporter().sendMail(mailOptions);
    } catch (error) {
      throw Boom.failedDependency(translate[language].emailNotSent);
    }
  }

  switch (type) {
    case HELPER:
      companyName = company.name;
      subject = `${companyName} - Bienvenue dans votre espace Compani`;
      options.companyName = companyName;
      customContent = EmailOptionsHelper.helperCustomContent();
      break;
    case TRAINER:
      customContent = EmailOptionsHelper.trainerCustomContent();
      break;
    case COACH:
    case CLIENT_ADMIN:
      customContent = EmailOptionsHelper.coachCustomContent();
      break;
    default:
      customContent = '';
  }

  const mailOptions = {
    from: `Compani <${SENDER_MAIL}>`,
    to: email,
    subject,
    html: EmailOptionsHelper.baseWelcomeContent(customContent, options),
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

exports.sendVerificationCodeEmail = async (receiver, verificationCode) => {
  const mailOptions = {
    from: `Compani <${SENDER_MAIL}>`,
    to: receiver,
    subject: 'Code de vérification de votre compte Compani',
    html: EmailOptionsHelper.verificationCodeEmail(verificationCode),
  };

  return NodemailerHelper.sendinBlueTransporter().sendMail(mailOptions);
};
