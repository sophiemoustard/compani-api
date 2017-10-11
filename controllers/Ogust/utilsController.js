const translate = require('../../helpers/translate');
const utils = require('../../models/Ogust/Utils');

const language = translate.language;

const getList = async (req, res) => {
  try {
    if (!req.query.key) {
      return res.status(400).json({ success: false, message: translate[language].missingParameters });
    }
    const params = {
      token: req.headers['x-ogust-token'],
      key: req.query.key
    };
    const list = await utils.getList(params);
    if (list.body.status == 'KO') {
      res.status(400).json({ success: false, message: list.body.message });
    } else {
      res.status(200).json({ success: true, message: translate[language].OgustGetListOk, data: list.body });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: translate[language].OgustGetListFailed });
  }
};

module.exports = { getList };
