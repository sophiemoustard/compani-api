// const flat = require('flat');
// const url = require('url');

const translate = require('../helpers/translate');
// const User = require('../models/User');
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
      // from: process.env.TWILIO_PHONE_NBR,
      from: 'Alenvi',
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

const sendSMSWarning = async (req, res) => {
  try {
    if (!req.params.phoneNbr || !req.body.id) {
      return res.status(400).json({ success: false, message: translate[language].missingParameters });
    }
    const msg = `Attention,
    il est nécessaire que tu télécharges l’application Facebook Messenger sur ton téléphone avant ta signature de contrat afin de pouvoir utiliser les outils Alenvi.
    Voici les liens:
- Apple: https://appstore.com/messenger
- Google: https://play.google.com/store/apps/details?id=com.facebook.orca
Puis connecte-toi en cliquant sur le lien suivant: ${process.env.MESSENGER_LINK}
Si tu ne parviens pas à faire ces étapes, contacte dès aujourd'hui la personne qui t'a recruté chez alenvi`;
    // Attention il est necessaire de telecharger messenger pour continuer ton inscription
    const internationalNbr = `+33${req.params.phoneNbr.substring(1)}`;
    const message = await twilio.messages.create({
      to: internationalNbr,
      // from: process.env.TWILIO_PHONE_NBR,
      from: 'Alenvi',
      body: msg
    });
    const sms = {
      from: message.from,
      to: message.to,
      body: message.body
    };
    return res.status(200).json({ success: true, message: translate[language].smsSent, data: { sms } });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

const getRecords = async (req, res) => {
  try {
    // const opts = {};
    // console.log(req.query);
    // if (req.query.pageSize) {
    //   if (isNaN(req.query.pageSize)) {
    //     return res.status(400).json({ success: false, message: translate[language].missingParameters });
    //   }
    //   opts.pageSize = Number(req.query.pageSize);
    // }
    // if (req.query.pageNumber) {
    //   if (isNaN(req.query.pageNumber)) {
    //     return res.status(400).json({ success: false, message: translate[language].missingParameters });
    //   }
    //   opts.pageNumber = Number(req.query.pageNumber);
    // }
    // if (req.query.pageToken) {
    //   opts.pageToken = req.query.pageToken;
    // }
    // const page = await twilio.messages.page(opts);
    // console.log(page);
    // const messageListRaw = await twilio.messages.list(opts);
    // console.log(twilio);
    const messageList = [];
    const opts = {
      done() {
        return res.status(200).json({ success: true, message: translate[language].smsSent, data: { messageList } });
      }
    };
    if (req.query.limit && !isNaN(req.query.limit)) {
      opts.limit = Number(req.query.limit);
    }
    twilio.messages.each(opts, (message) => {
      messageList.push({
        dateSent: message.dateSent,
        to: message.to,
        body: message.body
      });
    });
    // for (let i = 0, l = page.instances.length; i < l; i++) {
    //   messageList.push({
    //     dateSent: page.instances[i].dateSent,
    //     to: page.instances[i].to
    //   });
    // }
    // const nextPage = page._payload.next_page_uri ? url.parse(page._payload.next_page_uri, true).query : null;
    // return res.status(200).json({ success: true, message: translate[language].smsSent, data: { messageList } });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

// const getPageRecords = async (req, res) => {
//   const pageSize = req.query.pageSize && !isNaN(req.query.pageSize) ? { pageSize: req.query.pageSize } : { pageSize: 30 };
//
// }

module.exports = {
  sendSMS,
  sendSMSWarning,
  getRecords
};
