const nodemailer = require('nodemailer');

const sendGridTransporter = () => nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: 'apikey',
    pass: process.env.SENDGRID_API_KEY
  }
});


module.exports = { sendGridTransporter };
