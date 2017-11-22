const translate = require('../helpers/translate');
const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const language = translate.language;

const sendSMS = (req, res) => {
  try {
    if (!req.params.phoneNbr || !req.body.activationCode) {
      return res.status(400).json({ success: false, message: translate[language].missingParameters });
    }
    // Pour te connecter à Pigi, assure-toi de bien avoir l’application Messenger sur ton téléphone et clique sur le lien suivant: ${process.env.MESSENGER_LINK}
    const welcomeMessage = `Bienvenue chez Alenvi ! :) Utilise ce code: ${req.body.activationCode} pour pouvoir commencer ton enregistrement ici: https://app.alenvi.io/signup :-)`;
    const internationalNbr = `+33${req.params.phoneNbr.substring(1)}`;
    twilio.messages.create({
      to: internationalNbr,
      from: process.env.TWILIO_PHONE_NBR,
      body: welcomeMessage
    }, (err, message) => {
      if (err) {
        return res.status(500).json({ success: false, message: translate[language].smsNotSent });
      }
      const sms = {
        from: message.from,
        to: message.to,
        body: message.body
      };
      return res.status(200).json({ success: true, message: translate[language].smsSent, data: { sms } });
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

module.exports = {
  sendSMS
};
