const translate = require('../helpers/translate');
// const User = require('../models/User');

const { language } = translate;


const handleDocusignActions = async (req, res) => {
  try {
    return res.status(200).json({ text: 'OK' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

module.exports = { handleDocusignActions };
