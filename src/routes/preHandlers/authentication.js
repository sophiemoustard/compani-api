const Boom = require('@hapi/boom');
const flat = require('flat');
const User = require('../../models/User');
const IdentityVerification = require('../../models/IdentityVerification');
const { SECONDS_IN_AN_HOUR } = require('../../helpers/constants');
const translate = require('../../helpers/translate');

const { language } = translate;

exports.checkPasswordToken = async (req) => {
  const { query, params } = req;
  if (query.email) {
    const code = await IdentityVerification.findOne({ email: query.email, code: params.token }).lean();
    if (!code) throw Boom.notFound();

    const timeElapsed = (Date.now() - code.updatedAt) / 1000;
    if (timeElapsed > SECONDS_IN_AN_HOUR) throw Boom.unauthorized();

    const user = await User.findOne({ 'local.email': query.email }).select('local.email').lean();
    if (!user) throw Boom.notFound(translate[language].userNotFound);

    return user;
  }

  if (query.firstname && query.lastname) {
    const user = await User
      .findOne({ 'identity.firstname': query.firstname, 'identity.lastname': query.lastname, loginCode: params.token })
      .collation({ locale: 'fr', strength: 1, alternate: 'shifted' });
    if (!user) throw Boom.notFound(translate[language].userNotFound);

    return user;
  }

  const filter = { passwordToken: { token: params.token, expiresIn: { $gt: Date.now() } } };
  const user = await User.findOne(flat(filter, { maxDepth: 2 })).select('local').lean();
  if (!user) throw Boom.notFound(translate[language].userNotFound);

  return user;
};
