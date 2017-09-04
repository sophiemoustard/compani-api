const translate = require('../helpers/translate');
const Domains = require('../models/Facebook/Domains');

const language = translate.language;


const getWhitelistedDomains = async (req, res) => {
  try {
    if (!req.query.access_token) {
      return res.status(400).json({ success: false, message: translate[language].facebookNoToken });
    }
    const domains = await Domains.getWhitelistedDomains(req.query.access_token);
    return res.status(200).json({ success: true, message: translate[language].facebookGetWhitelistedDomainsOk, data: domains.body });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

const postWhitelistedDomains = async (req, res) => {
  try {
    if (!req.query.access_token) {
      return res.status(400).json({ success: false, message: translate[language].facebookNoToken });
    }
    if (!req.body.whitelisted_domains) {
      return res.status(400).json({ success: false, message: translate[language].missingParameters });
    }
    const domains = await Domains.postWhitelistedDomains(req.query.access_token, req.body.whitelisted_domains);
    return res.status(200).json({ success: true, message: translate[language].facebookPostWhitelistedDomainsOk, data: domains.body });
  } catch (e) {
    console.error(e.response.body);
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

module.exports = { getWhitelistedDomains, postWhitelistedDomains };
