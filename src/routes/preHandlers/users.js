const Boom = require('boom');
const User = require('../../models/User');
const translate = require('../../helpers/translate');

const { language } = translate;

exports.getUser = async (req) => {
  try {
    const userId = req.params._id;
    const user = await User.findById(userId).lean();
    if (!user) throw Boom.notFound(translate[language].userNotFound);

    return user;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.authorizeUserUpdate = (req) => {
  const { credentials } = req.auth;
  const user = req.pre.user || req.payload;

  if (user.company._id.toHexString() === credentials.company._id.toHexString()) return null;

  throw Boom.forbidden();
};
