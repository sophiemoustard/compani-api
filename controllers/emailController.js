const nodemailer = require('nodemailer');

const translate = require('../helpers/translate');
const { sendGridTransporter } = require('../helpers/nodemailer');

const { language } = translate;

const sendWelcome = async (req, res) => {
  try {
    if (!req.body.sender || !req.body.receiver) {
      return res.status(400).send({ success: false, message: `Erreur: ${translate[language].missingParameters}` });
    }
    const mailOptions = {
      from: req.body.sender.email, // sender address
      to: req.body.receiver.email, // list of receivers
      subject: 'Accès à notre application en ligne', // Subject line
      html: `<p>Bonjour,</p>
             <p>Vous pouvez désormais accéder à votre espace Alenvi dans lequel vous trouverez notamment les éléments suivants :<p>
             <ul>
              <li>Vos factures et attestations fiscales,</li>
              <li>Le planning d’interventions,</li>
              <li>Le blog Alenvi avec des informations utiles pour les aidants familiaux.</li>
             </ul>
             <p>Le lien :</p>
             <a href="${process.env.WEBSITE_HOSTNAME}/login">${process.env.WEBSITE_HOSTNAME}/login</a>
             <p>Vos identifiants pour y accéder:</p>
             <ul>
              <li>login : ${req.body.receiver.email}</li>
              <li>mot de passe : ${req.body.receiver.password}</li>
             </ul>
             <p>Nous vous recommandons de modifier votre mot de passe lors de votre première connexion.</p>
             <p>Nous espérons que cet accès en ligne vous sera utile.<br>
                Bien à vous,<br>
                L'équipe Alenvi</p>
             <p>01 79 75 54 75 - du lundi au vendredi de 9h à 19h</p>` // html body
    };
    const mailInfo = await sendGridTransporter.sendMail(mailOptions);
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
    const mailOptions = {
      from: 'support@alenvi.io', // sender address
      to: req.body.email, // list of receivers
      subject: 'Le mot de passe de votre compte Alenvi a bien été modifié.', // Subject line
      html: `<p>Bonjour,</p>
             <p>Votre mot de passe a bien été modifié.</p>
             <p>Si vous n'êtes pas à l'origine de ce changement, veuillez contacter le support technique.</p>
             <p>Bien cordialement,<br>
                L'équipe Alenvi</p>` // html body
    };
    const mailInfo = await sendGridTransporter.sendMail(mailOptions);
    return res.status(200).json({ success: true, message: translate[language].emailSent, data: { mailInfo } });
  } catch (e) {
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

const sendUserRequest = async (req, res) => {
  try {
    if (!req.body.user) {
      return res.status(400).send({ success: false, message: `Erreur: ${translate[language].missingParameters}` });
    }
    const mailOptions = {
      from: req.body.user.email, // sender address
      to: 'tasnime@alenvi.io', // list of receivers
      cc: 'alison@alenvi.io', // list of receivers
      subject: "Demande d'informations", // Subject line
      html: `<ul>
              <li>Nom: ${req.body.user.name || '-'}</li>
              <li>Tel: ${req.body.user.phone || '-'}</li>
              <li>Code Postal: ${req.body.user.zipCode || '-'}</li>
            </ul>
            <p>${req.body.user.message}</p>` // html body
    };
    const mailInfo = await sendGridTransporter.sendMail(mailOptions);
    return res.status(200).json({ success: true, message: translate[language].emailSent, data: { mailInfo } });
  } catch (e) {
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

const sendAuxiliaryWelcome = async (req, res) => {
  try {
    if (!req.body.email) {
      return res.status(400).send({ success: false, message: `Erreur: ${translate[language].missingParameters}` });
    }
    const mailOptions = {
      from: 'alenvi@alenvi.io', // sender address
      to: req.body.email, // list of receivers
      subject: 'Bienvenue chez Alenvi ! :)', // Subject line
      html: `<p>Bienvenue chez Alenvi,</p>
             <p>Ton compte a bien été créé.<br>
               Tu peux t'y connecter à tout moment en suivant ce lien:</p>
             <p><a href="${process.env.WEBSITE_HOSTNAME}/login">${process.env.WEBSITE_HOSTNAME}</a></p>
             <p>Merci et à bientôt,<br>
                L'équipe Alenvi</p>` // html body
    };
    const mailInfo = await sendGridTransporter.sendMail(mailOptions);
    return res.status(200).json({ success: true, message: translate[language].emailSent, data: { mailInfo } });
  } catch (e) {
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

module.exports = { sendWelcome, sendChangePasswordOk, sendUserRequest, sendAuxiliaryWelcome };

