const nodemailer = require('nodemailer');
const { sendinBlueTransporter, testTransporter } = require('./nodemailer');
const { invoiceEmail } = require('./emailOptions');
const { SENDER_MAIL } = require('./constants');

const invoiceAlert = async (receiver) => {
  console.log('receiver', receiver);
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

module.exports = {
  invoiceAlert,
};
