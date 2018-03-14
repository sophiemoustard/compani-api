const translate = require('../helpers/translate');
const User = require('../models/User');

const { language } = translate;


const handleSlackActions = async (req, res) => {
  try {
    if (!req.body.payload) {
      return res.status(400).json({ success: false, message: translate[language].missingParameters });
    }
    const parsedPayload = JSON.parse(req.body.payload);
    let id;
    if (parsedPayload.callback_id) {
      id = parsedPayload.callback_id.substring(0, parsedPayload.callback_id.indexOf('_'));
      if (parsedPayload.callback_id === `${id}_endorsement_processed` && parsedPayload.actions) {
        if (parsedPayload.actions[0].value === 'yes') {
        // Signature handler here
          await User.findOneAndUpdate({ _id: id }, { $set: { 'administrative.endorsement': true } });
          return res.status(200).json({ text: 'Avenant envoyé !' });
        }
        if (parsedPayload.actions[0].value === 'no') {
          return res.status(200).json({ replace_original: false, text: 'Annulé' });
        }
      }
    }
    return res.status(200).json({ text: 'OK' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

module.exports = { handleSlackActions };
