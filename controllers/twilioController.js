const flat = require('flat');

const translate = require('../helpers/translate');
const User = require('../models/User');
const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const language = translate.language;

const sendSMS = async (req, res) => {
  try {
    if (!req.params.phoneNbr || !req.body.activationCode) {
      return res.status(400).json({ success: false, message: translate[language].missingParameters });
    }
    // Pour te connecter à Pigi, assure-toi de bien avoir l’application Messenger sur ton téléphone et clique sur le lien suivant: ${process.env.MESSENGER_LINK}
    const welcomeMessage = `Bienvenue chez Alenvi ! :) Utilise ce code: ${req.body.activationCode} pour pouvoir commencer ton enregistrement ici avant ton intégration: ${process.env.WEBSITE_HOSTNAME}/signup :-)`;
    const internationalNbr = `+33${req.params.phoneNbr.substring(1)}`;
    const message = await twilio.messages.create({
      to: internationalNbr,
      from: process.env.TWILIO_PHONE_NBR,
      body: welcomeMessage
    });
    const sms = {
      from: message.from,
      to: message.to,
      body: message.body
    };
    return res.status(200).json({ success: true, message: translate[language].smsSent, data: { sms } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

const sendSMSConfirm = async (req, res) => {
  try {
    if (!req.params.phoneNbr || !req.body.id) {
      return res.status(400).json({ success: false, message: translate[language].missingParameters });
    }
    const msg = `Merci pour ton inscription,
Si tu ne t’es pas encore connecté avec tes identifiants sur Messenger, assure-toi d’abord de l’avoir bien téléchargé avec le lien suivant:
- Apple: https://appstore.com/messenger
- Google: https://play.google.com/store/apps/details?id=com.facebook.orca
Puis connecte-toi en cliquant sur le lien suivant: ${process.env.MESSENGER_LINK}`;
    const internationalNbr = `+33${req.params.phoneNbr.substring(1)}`;
    const message = await twilio.messages.create({
      to: internationalNbr,
      from: process.env.TWILIO_PHONE_NBR,
      body: msg
    });
    const sms = {
      from: message.from,
      to: message.to,
      body: message.body
    };
    const payload = {
      administrative: {
        signup: {
          secondSmsDate: Date.now()
        }
      }
    };
    const update = await User.findOneAndUpdate({ _id: req.body.id }, { $set: flat(payload) }, { new: true });
    console.log(update);
    return res.status(200).json({ success: true, message: translate[language].smsSent, data: { sms } });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

module.exports = {
  sendSMS,
  sendSMSConfirm
};
