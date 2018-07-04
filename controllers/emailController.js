const Boom = require('boom');
const nodemailer = require('nodemailer');

const translate = require('../helpers/translate');
const { sendGridTransporter, testTransporter } = require('../helpers/nodemailer');

const { language } = translate;

const sendWelcome = async (req) => {
  try {
    const mailOptions = {
      from: req.payload.sender.email, // sender address
      to: req.payload.receiver.email, // list of receivers
      subject: 'Alenvi - Accès à notre application en ligne', // Subject line
      html: `<p>Bonjour,</p>
             <p>Vous pouvez désormais accéder à votre espace Alenvi dans lequel vous trouverez les éléments suivants :<p>
             <ul>
              <li>Vos factures et attestations fiscales,</li>
              <li>Le planning des interventions,</li>
              <li>Le blog Alenvi avec des informations utiles pour les aidants familiaux.</li>
             </ul>
             <p>Le lien : <a href="${process.env.WEBSITE_HOSTNAME}/login">${process.env.WEBSITE_HOSTNAME}/login</a></p>
             <p>Vos identifiants pour y accéder:</p>
             <ul>
              <li>login : ${req.payload.receiver.email}</li>
              <li>mot de passe : ${req.payload.receiver.password}</li>
             </ul>
             <p>Nous vous recommandons de modifier votre mot de passe lors de votre première connexion.</p>
             <p>Pour faciliter la prise en main de ces nouvelles fonctionnalités nous vous joignons <a href="https://www.youtube.com/watch?v=_CFPVFLAiTo">un cours tutoriel</a>.</p>
             <p>Nous espérons que cet accès en ligne vous sera utile.<br>
                Bien à vous,</p>
             <p>L'équipe Alenvi</p>
             <p>01 79 75 54 75</p>
             <p>Du lundi au vendredi de 9h à 18h</p>
             <img src="https://res.cloudinary.com/alenvi/image/upload/c_scale,w_183/v1507124345/images/business/alenvi_logo_complet_full.png" alt="Logo Alenvi">` // html body
    };
    const mailInfo = process.env.NODE_ENV !== 'test' ? await sendGridTransporter.sendMail(mailOptions) : await testTransporter(await nodemailer.createTestAccount()).sendMail(mailOptions);
    return { message: translate[language].emailSent, data: { mailInfo } };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const sendAuxiliaryWelcome = async (req) => {
  try {
    const mailOptions = {
      from: 'alenvi@alenvi.io', // sender address
      to: req.payload.email, // list of receivers
      subject: 'Bienvenue chez Alenvi ! :)', // Subject line
      html: `<p>Bienvenue chez Alenvi,</p>
             <p>Ton compte a bien été créé.<br>
               Tu peux t'y connecter à tout moment en suivant ce lien:</p>
             <p><a href="${process.env.WEBSITE_HOSTNAME}/login">${process.env.WEBSITE_HOSTNAME}</a></p>
             <p>Merci et à bientôt,<br>
                L'équipe Alenvi</p>` // html body
    };
    const mailInfo = process.env.NODE_ENV !== 'test' ? await sendGridTransporter.sendMail(mailOptions) : await testTransporter(await nodemailer.createTestAccount()).sendMail(mailOptions);
    return { message: translate[language].emailSent, data: { mailInfo } };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

module.exports = {
  sendWelcome,
  sendAuxiliaryWelcome
};

