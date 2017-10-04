const translate = require('../helpers/translate');
const { rssFeeds } = require('../models/Blog/RssFeeds');

const language = translate.language;

const getRssFeeds = async (req, res) => {
  try {
    if (!req.query.feed_url) {
      return res.status(400).json({ success: false, message: translate[language].blogGetRssFeedsNoUrl });
    }
    const feeds = await rssFeeds(req.query.feed_url);
    return res.status(200).json({ success: true, message: translate[language].blogGetRssFeedsOk, data: feeds });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

module.exports = { getRssFeeds };
