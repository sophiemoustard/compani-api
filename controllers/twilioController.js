const translate = require('../helpers/translate');
const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

console.log(process.env.TWILIO_ACCOUNT_SID);
console.log(process.env.TWILIO_AUTH_TOKEN);

const language = translate.language;

const sendSMS = (req, res) => {
  try {
    if (!req.params.phoneNbr || !req.body.activationCode) {
      return res.status(400).json({ success: false, message: translate[language].missingParameters });
    }
    const welcomeMessage = `Bienvenue chez Alenvi ! :) Pour te connecter à Pigi, assure-toi que tu as bien l’application Messenger sur ton téléphone et clique sur le lien suivant : ${process.env.MESSENGER_LINK} et sers-toi du code ${req.body.activationCode} pour te connecter`;
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
