const translate = require('../helpers/translate');
const User = require('../models/User');
const Role = require('../models/Role');

const language = translate.language;

exports.updateRole = async (req, res) => {
  try {
    if (!req.query && !req.query.formerRole && !req.query.newRole) {
      return res.status(400).json({ success: false, message: translate[language].missingParameters });
    }
    const role = await Role.findOne({ name: req.query.newRole });
    console.log(role);
    const users = await User.find().lean();
    console.log('users', users);
    users.forEach(async (user) => {
      if (user.role === req.query.formerRole) {
        console.log('VRAI');
        await User.findOneAndUpdate({ _id: user._id }, { $set: { role: role._id } });
      }
    });
    console.log('OK');
    return res.status(200).json({ success: true, message: 'OK' });
  } catch (e) {
    console.error(e);
    return res.status(500).send({ success: false, message: `Erreur: ${translate[language].unexpectedBehavior}` });
  }
};
