const translate = require('../../helpers/translate');
const token = require('../../models/Ogust/Token');

const language = translate.language;

const get = async (req, res) => {
  try {
    const newToken = await token.getToken();
    res.status(200).json({ success: true, message: translate[language].OgustGetTokenOk, data: newToken.body });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: translate[language].OgustGetTokenFailed });
  }
};

module.exports = { get };
