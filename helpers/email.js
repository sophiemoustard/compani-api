const nodemailer = require('nodemailer');
const { sendinBlueTransporter, testTransporter } = require('./nodemailer');
const { invoiceEmail, completeInvoiceScriptEmailBody } = require('./emailOptions');
const { SENDER_MAIL } = require('./constants');

const invoiceAlertEmail = async (receiver) => {
  const mailOptions = {
    from: `Compani <${SENDER_MAIL}>`,
    to: receiver,
    subject: 'Nouvelle facture Alenvi',
    html: invoiceEmail(),
  };

  const mailInfo = process.env.NODE_ENV === 'production'
    ? await sendinBlueTransporter.sendMail(mailOptions)
    : await testTransporter(await nodemailer.createTestAccount()).sendMail(mailOptions);

  return mailInfo;
};

const completeInvoiceScriptEmail = async (sentNb, emails = null) => {
  const mailOptions = {
    from: `Compani <${SENDER_MAIL}>`,
    to: process.env.TECH_EMAILS,
    subject: 'Script envoi factures',
    html: completeInvoiceScriptEmailBody(sentNb, emails),
  };

  const mailInfo = process.env.NODE_ENV === 'production'
    ? await sendinBlueTransporter.sendMail(mailOptions)
    : await testTransporter(await nodemailer.createTestAccount()).sendMail(mailOptions);

  return mailInfo;
};

module.exports = {
  invoiceAlertEmail,
  completeInvoiceScriptEmail,
};
