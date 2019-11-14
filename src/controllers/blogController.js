const Boom = require('boom');

const translate = require('../helpers/translate');
const { rssFeeds } = require('../models/Blog/RssFeeds');

const { language } = translate;

const getRssFeeds = async (req) => {
  try {
    const feeds = await rssFeeds(req.query.feed_url);
    return { message: translate[language].blogGetRssFeedsOk, data: feeds };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { getRssFeeds };
