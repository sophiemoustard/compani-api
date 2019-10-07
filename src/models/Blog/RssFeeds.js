const { parse: feedparser } = require('feedparser-promised');

exports.rssFeeds = async (url) => {
  const feeds = await feedparser(url);
  return feeds;
};
