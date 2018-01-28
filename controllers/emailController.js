const nodemailer = require('nodemailer');

const translate = require('../helpers/translate');

const language = translate.language;

const sendWelcome = async (req, res) => {
  try {
    if (!req.body.sender || !req.body.receiver) {
      return res.status(400).send({ success: false, message: `Erreur: ${translate[language].missingParameters}` });
    }
    const account = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 465,
      secure: true, // true for 465, false for other ports
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY
      }
    });
    const mailOptions = {
      from: req.body.sender.email, // sender address
      to: req.body.receiver.email, // list of receivers
      subject: 'Accès à notre application en ligne', // Subject line
      html: `<p>Bonjour ${req.body.receiver.title} ${req.body.receiver.name}</p>
             <p>Vous disposez d'un accès à notre application web à l'adresse suivante:<p>
             <a href="${process.env.WEBSITE_HOSTNAME}/dashboard/login">${process.env.WEBSITE_HOSTNAME}/dashboard/login</a>
             <p>Vos identifiants sont :</p>
             <p>login: ${req.body.receiver.email},<br>
                mot de passe: ${req.body.receiver.password}</p>
             <p>Bien cordialement,<br>
                L'équipe Alenvi</p>` // html body
    };
    const mailInfo = await transporter.sendMail(mailOptions);
    return res.status(200).json({ success: true, message: translate[language].emailSent, data: { mailInfo } });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

const sendChangePasswordOk = async (req, res) => {
  try {
    if (!req.body.email) {
      return res.status(400).send({ success: false, message: `Erreur: ${translate[language].missingParameters}` });
    }
    const transporter = nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 465,
      secure: true, // true for 465, false for other ports
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY
      }
    });
    const mailOptions = {
      from: 'support@alenvi.io', // sender address
      to: req.body.email, // list of receivers
      subject: 'Le mot de passe de votre compte Alenvi a bien été modifié', // Subject line
      html: `<p>Bonjour,</p>
             <p>Votre mot de passe a bien été modifié</p>
             <p>Si vous n'êtes pas à l'origine de ce changement, veuillez contacter le support technique.</p>
             <p>Bien cordialement,<br>
                L'équipe Alenvi</p>` // html body
    };
    const mailInfo = await transporter.sendMail(mailOptions);
    return res.status(200).json({ success: true, message: translate[language].emailSent, data: { mailInfo } });
  } catch (e) {
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

module.exports = { sendWelcome, sendChangePasswordOk };
