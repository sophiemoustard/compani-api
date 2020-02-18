const nodemailer = require('nodemailer');

const sendinBlueTransporter = nodemailer.createTransport({
  service: 'SendinBlue',
  auth: {
    user: process.env.SENDINBLUE_USER,
    pass: process.env.SENDINBLUE_PWD,
  },
});

const testTransporter = account => nodemailer.createTransport({
  host: 'smtp.ethereal.email',
  port: 587,
  secure: false,
  auth: { user: account.user, pass: account.pass },
});

module.exports = { sendinBlueTransporter, testTransporter };
