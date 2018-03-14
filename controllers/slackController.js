const translate = require('../helpers/translate');

const { language } = translate;


const handleSlackActions = async (req, res) => {
  try {
    if (!req.body.payload) {
      return res.status(400).json({ success: false, message: translate[language].missingParameters });
    }
    const parsedPayload = JSON.parse(req.body.payload);
    if (parsedPayload.callback_id && parsedPayload.callback_id === 'endorsement_processed' && parsedPayload.actions) {
      if (parsedPayload.actions[0].value === 'yes') {
        // Signature handler here
        return res.status(200).json({ text: 'Avenant envoyé !' });
      }
      if (parsedPayload.actions[0].value === 'no') {
        return res.status(200).json({ replace_original: false, text: 'Annulé' });
      }
    }
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

module.exports = { handleSlackActions };
