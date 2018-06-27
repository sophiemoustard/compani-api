const nodemailer = require('nodemailer');

const sendGridTransporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: 'apikey',
    pass: process.env.SENDGRID_API_KEY
  }
});

const testTransporter = account => nodemailer.createTransport({
  host: 'smtp.ethereal.email',
  port: 587,
  secure: false,
  auth: {
    user: account.user,
    pass: account.pass
  }
});

module.exports = { sendGridTransporter, testTransporter };
