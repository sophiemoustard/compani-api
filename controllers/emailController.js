const nodemailer = require('nodemailer');

const translate = require('../helpers/translate');

const language = translate.language;

const sendWelcolme = async (req, res) => {
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

module.exports = { sendWelcolme };
